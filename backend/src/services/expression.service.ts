import {
  assessExpressionAttempt,
  assessExpressionReviewAttempt,
  generateEverydayExpression,
  type ExpressionGenerationCategory
} from "../ai/analysis.client.js";
import { API_MESSAGES } from "../constants/api-messages.js";
import type { ExpressionAttemptRecord } from "../models/expression-attempt.model.js";
import type { ExpressionPromptRecord } from "../models/expression-prompt.model.js";
import type { ExpressionPracticeMode } from "../models/expression-prompt.model.js";
import type { ExpressionReviewItemRecord } from "../models/expression-review-item.model.js";
import {
  computeReviewTransition,
  shouldEnqueueForReview
} from "../logic/expression-review.logic.js";
import { logger } from "../config/logger.js";
import { expressionReviewRepository } from "../repositories/expression-review.repository.js";
import { expressionRepository } from "../repositories/expression.repository.js";
import { dailyGoalService } from "./daily-goal.service.js";
import { AppError } from "../utils/app-error.js";
import { createRefillQueue } from "../utils/refill-queue.js";

export interface ExpressionReviewAssessmentRecord {
  reviewItem: ExpressionReviewItemRecord;
  naturalnessScore: number;
  feedback: string;
}

const EXPRESSION_POOL_GENERATION_SIZE = 20;
const EXPRESSION_MIN_UNSEEN_BUFFER = 6;
const EXPRESSION_AVOID_LIST_SIZE = 80;
const EXPRESSION_MAX_CONCURRENT_REFILLS = 2;
// Spacing gate: a recognized item becomes due for production after this delay,
// so production lands in a later session rather than the same sitting.
export const RECOGNITION_TO_PRODUCTION_DELAY_MS = 6 * 60 * 60 * 1000;

const shuffle = <T>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
};

// Build the MCQ options for recognition mode. Falls back to production when the
// prompt has no stored answer/distractors (legacy rows).
const buildDelivery = async (
  prompt: ExpressionPromptRecord,
  requestedMode: ExpressionPracticeMode
): Promise<ExpressionPromptRecord> => {
  if (requestedMode !== "recognition") {
    return { ...prompt, mode: "production" };
  }
  const answer = await expressionRepository.findPromptAnswerById({ promptId: prompt.id });
  const distractors = answer?.distractors ?? [];
  if (!answer?.nativeAnswer || distractors.length < 1) {
    return { ...prompt, mode: "production" };
  }
  return {
    ...prompt,
    mode: "recognition",
    options: shuffle([answer.nativeAnswer, ...distractors])
  };
};

interface GeneratePromptPoolInput {
  userId: number;
  categories: ExpressionGenerationCategory[];
  countPerCategory: number;
}

interface GeneratedPromptPool {
  promptsByCategory: Record<string, ExpressionPromptRecord[]>;
  countPerCategory: number;
  categories: string[];
}

const generatePromptPool = async (input: GeneratePromptPoolInput): Promise<GeneratedPromptPool> => {
  const promptsByCategory: Record<string, ExpressionPromptRecord[]> = {};

  for (const category of input.categories) {
    const prompts: ExpressionPromptRecord[] = [];
    const seenIds = new Set<number>();
    const avoidTexts = new Set(
      (
        await expressionRepository.listRecentPromptTextsByCategory({
          category,
          limit: EXPRESSION_AVOID_LIST_SIZE
        })
      ).map((text) => text.trim().toLowerCase())
    );
    let attempts = 0;
    const maxAttempts = input.countPerCategory * 8;
    while (prompts.length < input.countPerCategory && attempts < maxAttempts) {
      attempts += 1;
      const generated = await generateEverydayExpression(category, {
        avoidEnglishTexts: Array.from(avoidTexts)
      });
      const created = await expressionRepository.createPrompt({
        userId: input.userId,
        englishText: generated.englishText,
        situationText: generated.situationText,
        nativeAnswer: generated.nativeAnswer,
        distractors: generated.distractors,
        generatedContext: generated.generatedContext,
        generationCategory: category
      });
      avoidTexts.add(created.englishText.trim().toLowerCase());
      if (seenIds.has(created.id)) {
        continue;
      }
      seenIds.add(created.id);
      prompts.push(created);
    }
    promptsByCategory[category] = prompts;
  }

  return {
    promptsByCategory,
    countPerCategory: input.countPerCategory,
    categories: input.categories
  };
};

const poolRefillQueue = createRefillQueue<{ userId: number; category: ExpressionGenerationCategory }>({
  maxConcurrent: EXPRESSION_MAX_CONCURRENT_REFILLS,
  run: async (input) => {
    await generatePromptPool({
      userId: input.userId,
      categories: [input.category],
      countPerCategory: EXPRESSION_POOL_GENERATION_SIZE
    });
  },
  onError: (input, error) => {
    logger.error("Expression pool background refill failed", {
      category: input.category,
      error: error instanceof Error ? error.message : error
    });
  }
});

export const scheduleExpressionPoolRefill = (input: {
  userId: number;
  category: ExpressionGenerationCategory;
}): boolean => {
  return poolRefillQueue.schedule(input.category, input);
};

export const expressionPoolRefillScheduler = {
  schedule: scheduleExpressionPoolRefill
};

export const expressionService = {
  async generatePrompt(userId: number, category: ExpressionGenerationCategory): Promise<ExpressionPromptRecord> {
    const prompts = await generatePromptPool({
      userId,
      categories: [category],
      countPerCategory: 1
    });
    const first = prompts.promptsByCategory[category]?.[0] ?? null;
    if (!first) {
      throw new AppError(500, "EXPRESSION_PROMPT_NOT_FOUND", API_MESSAGES.errors.expressionPromptNotFound);
    }
    return first;
  },
  async getNextPrompt(input: { userId: number; category: ExpressionGenerationCategory }): Promise<ExpressionPromptRecord> {
    const now = new Date();

    // 1) An item recognized earlier and now due for production (the spaced test).
    const dueProduction = await expressionRepository.findDueProductionPrompt({
      userId: input.userId,
      category: input.category,
      now
    });
    if (dueProduction) {
      return buildDelivery(dueProduction, "production");
    }

    // 2) A fresh unseen item → first encounter is recognition.
    const unseen = await expressionRepository.listUnseenPromptsByCategory({
      userId: input.userId,
      category: input.category,
      limit: EXPRESSION_MIN_UNSEEN_BUFFER
    });

    let nextPrompt: ExpressionPromptRecord | null = unseen[0] ?? null;
    let mode: ExpressionPracticeMode = "recognition";

    // 3) Nothing new and nothing due → recycle a previously produced item.
    if (!nextPrompt) {
      nextPrompt = await expressionRepository.findLeastRecentlyViewedPrompt({
        userId: input.userId,
        category: input.category
      });
      mode = "production";
    }

    // 4) Pool empty → generate one (fresh, so recognition).
    if (!nextPrompt) {
      const generated = await generatePromptPool({
        userId: input.userId,
        categories: [input.category],
        countPerCategory: 1
      });
      nextPrompt = generated.promptsByCategory[input.category]?.[0] ?? null;
      mode = "recognition";
    }

    if (!nextPrompt) {
      throw new AppError(500, "EXPRESSION_PROMPT_NOT_FOUND", API_MESSAGES.errors.expressionPromptNotFound);
    }

    const delivery = await buildDelivery(nextPrompt, mode);
    // Record the encounter so the item is not re-served as "unseen".
    await expressionRepository.markRecognitionServed({ userId: input.userId, promptId: nextPrompt.id });

    if (unseen.length < EXPRESSION_MIN_UNSEEN_BUFFER) {
      expressionPoolRefillScheduler.schedule(input);
    }

    return delivery;
  },

  async assessRecognition(input: {
    userId: number;
    promptId: number;
    chosenText: string;
  }): Promise<{ correct: boolean; correctAnswer: string; englishText: string }> {
    const prompt = await expressionRepository.findPromptById({ promptId: input.promptId });
    if (!prompt) {
      throw new AppError(404, "EXPRESSION_PROMPT_NOT_FOUND", API_MESSAGES.errors.expressionPromptNotFound);
    }
    const hasViewed = await expressionRepository.hasUserViewedPrompt({ userId: input.userId, promptId: input.promptId });
    if (!hasViewed) {
      throw new AppError(404, "EXPRESSION_PROMPT_NOT_FOUND", API_MESSAGES.errors.expressionPromptNotFound);
    }
    const answer = await expressionRepository.findPromptAnswerById({ promptId: input.promptId });
    const correctAnswer = answer?.nativeAnswer ?? "";
    const normalize = (text: string): string => text.trim().toLowerCase().replace(/\s+/g, " ");
    const correct = normalize(input.chosenText) === normalize(correctAnswer);

    // Recognition done now; production becomes due after the spacing delay.
    await expressionRepository.markRecognitionDone({
      userId: input.userId,
      promptId: input.promptId,
      productionDueAt: new Date(Date.now() + RECOGNITION_TO_PRODUCTION_DELAY_MS)
    });

    // Lightweight attempt row so the daily goal / activity count recognition as
    // practice; phase 'recognition' keeps it out of history/trends/review.
    await expressionRepository.createAttempt({
      userId: input.userId,
      promptId: input.promptId,
      englishText: prompt.englishText,
      userAnswerText: input.chosenText,
      naturalnessScore: correct ? 100 : 0,
      feedback: "",
      nativeLikeVersion: correctAnswer,
      alternatives: [],
      phase: "recognition"
    });

    await dailyGoalService.recordGoalProgress(input.userId);
    return { correct, correctAnswer, englishText: prompt.englishText };
  },
  async generatePromptPool(input: GeneratePromptPoolInput): Promise<GeneratedPromptPool> {
    return generatePromptPool(input);
  },

  async assessAttempt(input: {
    userId: number;
    promptId: number;
    userAnswerText: string;
  }): Promise<ExpressionAttemptRecord> {
    const prompt = await expressionRepository.findPromptById({
      promptId: input.promptId
    });
    if (!prompt) {
      throw new AppError(404, "EXPRESSION_PROMPT_NOT_FOUND", API_MESSAGES.errors.expressionPromptNotFound);
    }
    const hasViewed = await expressionRepository.hasUserViewedPrompt({ userId: input.userId, promptId: input.promptId });
    if (!hasViewed) {
      throw new AppError(404, "EXPRESSION_PROMPT_NOT_FOUND", API_MESSAGES.errors.expressionPromptNotFound);
    }

    const answer = await expressionRepository.findPromptAnswerById({ promptId: input.promptId });
    const isSkipAnswer = isIDontKnowAnswer(input.userAnswerText);
    const assessment = await assessExpressionAttempt({
      englishText: prompt.englishText,
      situationText: prompt.situationText,
      referenceAnswer: answer?.nativeAnswer ?? null,
      userAnswerText: input.userAnswerText
    });
    if (isSkipAnswer) {
      assessment.feedback = "";
      assessment.naturalnessScore = 0;
    }

    const created = await expressionRepository.createAttempt({
      userId: input.userId,
      promptId: input.promptId,
      englishText: prompt.englishText,
      userAnswerText: input.userAnswerText,
      naturalnessScore: Math.round(assessment.naturalnessScore),
      feedback: assessment.feedback,
      nativeLikeVersion: assessment.nativeLikeVersion,
      alternatives: assessment.alternatives,
      phase: "production"
    });

    // Mark the spaced production phase complete for this user+prompt.
    await expressionRepository.markProductionDone({ userId: input.userId, promptId: input.promptId });

    if (shouldEnqueueForReview(created.naturalnessScore)) {
      await expressionReviewRepository.upsertLowScoreItem({
        userId: input.userId,
        englishText: created.englishText,
        naturalnessScore: created.naturalnessScore,
        baselineNativeLikeVersion: created.nativeLikeVersion,
        baselineAlternatives: created.alternatives,
        baselineFeedback: created.feedback
      });
    }

    await dailyGoalService.recordGoalProgress(input.userId);
    return created;
  },

  async listHistory(input: { userId: number; limit?: number; offset?: number }): Promise<{
    items: ExpressionAttemptRecord[];
    total: number;
    limit: number;
    offset: number;
    page: number;
    totalPages: number;
    hasMore: boolean;
  }> {
    const limit = input.limit ?? 30;
    const offset = input.offset ?? 0;
    const [items, total] = await Promise.all([
      expressionRepository.listAttempts({
        userId: input.userId,
        limit,
        offset
      }),
      expressionRepository.countAttempts({ userId: input.userId })
    ]);
    const historyByExpression = await expressionRepository.listAttemptHistoryByEnglishTexts({
      userId: input.userId,
      englishTexts: items.map((item) => item.englishText)
    });
    const itemsWithHistory = items.map((item) => ({
      ...item,
      attemptHistory: historyByExpression[item.englishText] ?? []
    }));
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = Math.floor(offset / limit) + 1;
    return {
      items: itemsWithHistory,
      total,
      limit,
      offset,
      page,
      totalPages,
      hasMore: offset + itemsWithHistory.length < total
    };
  },

  async listDueReviewItems(input: { userId: number; limit?: number }): Promise<{ dueCount: number; items: ExpressionReviewItemRecord[] }> {
    const [dueCount, items] = await Promise.all([
      expressionReviewRepository.countDueItems(input.userId),
      expressionReviewRepository.listDueItems({
        userId: input.userId,
        limit: input.limit ?? 50
      })
    ]);
    return { dueCount, items };
  },

  async assessReviewAttempt(input: {
    userId: number;
    reviewItemId: number;
    userAnswerText: string;
  }): Promise<ExpressionReviewAssessmentRecord> {
    const item = await expressionReviewRepository.findById({
      userId: input.userId,
      reviewItemId: input.reviewItemId
    });

    if (!item) {
      throw new AppError(404, "EXPRESSION_REVIEW_ITEM_NOT_FOUND", API_MESSAGES.errors.expressionReviewItemNotFound);
    }

    const dueAtMs = new Date(item.nextReviewAt).getTime();
    if (Number.isFinite(dueAtMs) && dueAtMs > Date.now()) {
      throw new AppError(409, "EXPRESSION_REVIEW_ITEM_NOT_DUE", API_MESSAGES.errors.expressionReviewItemNotDue, {
        nextReviewAt: item.nextReviewAt
      });
    }

    const reviewAssessment = await assessExpressionReviewAttempt({
      englishText: item.englishText,
      userAnswerText: input.userAnswerText,
      baselineNativeLikeVersion: item.baselineNativeLikeVersion
    });

    const roundedScore = Math.round(reviewAssessment.naturalnessScore);
    const now = new Date();

    const transition = computeReviewTransition(item, roundedScore, now);

    const updated = await expressionReviewRepository.saveReviewProgress({
      userId: input.userId,
      reviewItemId: input.reviewItemId,
      naturalnessScore: roundedScore,
      successCount: transition.successCount,
      reviewAttemptCount: item.reviewAttemptCount + 1,
      nextReviewAt: transition.nextReviewAt,
      status: transition.status
    });

    if (!updated) {
      throw new AppError(404, "EXPRESSION_REVIEW_ITEM_NOT_FOUND", API_MESSAGES.errors.expressionReviewItemNotFound);
    }

    // Persist review attempts into regular expression history as well,
    // so history reflects the latest percentages over retries.
    const reviewPrompt = await expressionRepository.createPrompt({
      userId: input.userId,
      englishText: item.englishText,
      generatedContext: "review_retry",
      generationCategory: "review"
    });
    await expressionRepository.markPromptViewed({ userId: input.userId, promptId: reviewPrompt.id });
    await expressionRepository.createAttempt({
      userId: input.userId,
      promptId: reviewPrompt.id,
      englishText: item.englishText,
      userAnswerText: input.userAnswerText,
      naturalnessScore: roundedScore,
      feedback: reviewAssessment.feedback,
      nativeLikeVersion: item.baselineNativeLikeVersion,
      alternatives: item.baselineAlternatives
    });

    return {
      reviewItem: updated,
      naturalnessScore: roundedScore,
      feedback: reviewAssessment.feedback
    };
  }
};

const isIDontKnowAnswer = (text: string): boolean => {
  const normalized = text.trim().toLowerCase();
  return normalized === "i don't know." || normalized === "i don't know" || normalized === "idk";
};
