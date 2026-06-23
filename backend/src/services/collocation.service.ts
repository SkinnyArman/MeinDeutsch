import {
  assessCollocationAttempt,
  assessCollocationReviewAttempt,
  generateCollocation
} from "../ai/analysis.client.js";
import { API_MESSAGES } from "../constants/api-messages.js";
import {
  COLLOCATION_CATEGORIES,
  COLLOCATION_GENERATION_CATEGORIES,
  type CollocationGenerationCategory
} from "../constants/collocation-generation.config.js";
import type { CollocationAttemptRecord } from "../models/collocation-attempt.model.js";
import type { CollocationPromptRecord } from "../models/collocation-prompt.model.js";
import type { CollocationReviewItemRecord } from "../models/collocation-review-item.model.js";
import {
  computeReviewTransition,
  shouldEnqueueForReview
} from "../logic/expression-review.logic.js";
import { logger } from "../config/logger.js";
import { collocationReviewRepository } from "../repositories/collocation-review.repository.js";
import { collocationRepository, normalizeCollocationText } from "../repositories/collocation.repository.js";
import { dailyGoalService } from "./daily-goal.service.js";
import { buildLearnerContext } from "./learner-context.service.js";
import { AppError } from "../utils/app-error.js";
import { createRefillQueue } from "../utils/refill-queue.js";

const COLLOCATION_POOL_GENERATION_SIZE = 10;
const COLLOCATION_MIN_UNSEEN_BUFFER = 4;
const COLLOCATION_AVOID_LIST_SIZE = 60;
const COLLOCATION_MAX_CONCURRENT_REFILLS = 2;

export interface CollocationReviewAssessmentRecord {
  reviewItem: CollocationReviewItemRecord;
  score: number;
  feedback: string;
}

const GAP_PATTERN = /_{2,}/g;

// Article/reflexive variants of the same collocation ("eine Entscheidung treffen"
// vs "die Entscheidung treffen") must count as duplicates for the avoid list.
const toDedupKey = (text: string): string =>
  normalizeCollocationText(text)
    .replace(/\b(der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines|sich|etwas|jemandem|jemanden)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Reject generations where the cloze is structurally unusable: there must be
// exactly one gap, and the answer must be plain words (no gap markers).
const isValidGeneratedCloze = (generated: {
  clozeSentence: string;
  clozeAnswer: string;
  germanText: string;
}): boolean => {
  const gaps = generated.clozeSentence.match(GAP_PATTERN) ?? [];
  return (
    gaps.length === 1 &&
    generated.clozeAnswer.trim().length > 0 &&
    !/_/.test(generated.clozeAnswer) &&
    generated.germanText.trim().length > 0
  );
};

const generatePromptPool = async (input: {
  userId: number;
  category: CollocationGenerationCategory;
  count: number;
}): Promise<CollocationPromptRecord[]> => {
  // Avoid list spans ALL categories so the same collocation is not regenerated
  // for a different category pool.
  const recentTexts = await collocationRepository.listRecentPromptTexts({
    limit: COLLOCATION_AVOID_LIST_SIZE
  });
  const avoidTexts = new Set(recentTexts.map((text) => normalizeCollocationText(text)));
  const avoidKeys = new Set(recentTexts.map((text) => toDedupKey(text)));

  const prompts: CollocationPromptRecord[] = [];
  const seenIds = new Set<number>();
  let attempts = 0;
  const maxAttempts = input.count * 8;
  while (prompts.length < input.count && attempts < maxAttempts) {
    attempts += 1;
    const generated = await generateCollocation(input.category, {
      avoidGermanTexts: Array.from(avoidTexts)
    });
    if (!isValidGeneratedCloze(generated)) {
      continue;
    }
    if (avoidKeys.has(toDedupKey(generated.germanText))) {
      continue;
    }
    const created = await collocationRepository.createPrompt({
      userId: input.userId,
      germanText: generated.germanText,
      englishText: generated.englishText,
      clozeSentence: generated.clozeSentence,
      clozeAnswer: generated.clozeAnswer,
      collocationType: generated.collocationType,
      generationCategory: input.category
    });
    avoidTexts.add(normalizeCollocationText(generated.germanText));
    avoidKeys.add(toDedupKey(generated.germanText));
    if (seenIds.has(created.id)) {
      continue;
    }
    seenIds.add(created.id);
    prompts.push(created);
  }

  return prompts;
};

const poolRefillQueue = createRefillQueue<{ userId: number; category: CollocationGenerationCategory }>({
  maxConcurrent: COLLOCATION_MAX_CONCURRENT_REFILLS,
  run: async (input) => {
    await generatePromptPool({
      userId: input.userId,
      category: input.category,
      count: COLLOCATION_POOL_GENERATION_SIZE
    });
  },
  onError: (input, error) => {
    logger.error("Collocation pool background refill failed", {
      category: input.category,
      error: error instanceof Error ? error.message : error
    });
  }
});

export const scheduleCollocationPoolRefill = (input: {
  userId: number;
  category: CollocationGenerationCategory;
}): boolean => {
  return poolRefillQueue.schedule(input.category, input);
};

export const collocationPoolRefillScheduler = {
  schedule: scheduleCollocationPoolRefill
};

export const collocationService = {
  listCategories(): Array<{ id: string; label: string }> {
    return COLLOCATION_CATEGORIES.map((category) => ({ id: category.id, label: category.label }));
  },

  isKnownCategory(category: string): category is CollocationGenerationCategory {
    return COLLOCATION_GENERATION_CATEGORIES.includes(category);
  },

  async getNextPrompt(input: {
    userId: number;
    category: CollocationGenerationCategory;
  }): Promise<CollocationPromptRecord> {
    const unseen = await collocationRepository.listUnseenPromptsByCategory({
      userId: input.userId,
      category: input.category,
      limit: COLLOCATION_MIN_UNSEEN_BUFFER
    });

    let nextPrompt: CollocationPromptRecord | null = unseen[0] ?? null;
    if (!nextPrompt) {
      nextPrompt = await collocationRepository.findLeastRecentlyViewedPrompt({
        userId: input.userId,
        category: input.category
      });
    }

    if (!nextPrompt) {
      const generated = await generatePromptPool({
        userId: input.userId,
        category: input.category,
        count: 1
      });
      nextPrompt = generated[0] ?? null;
    }

    if (!nextPrompt) {
      throw new AppError(500, "COLLOCATION_PROMPT_NOT_FOUND", API_MESSAGES.errors.collocationPromptNotFound);
    }

    await collocationRepository.markPromptViewed({ userId: input.userId, promptId: nextPrompt.id });

    if (unseen.length < COLLOCATION_MIN_UNSEEN_BUFFER) {
      collocationPoolRefillScheduler.schedule(input);
    }

    return nextPrompt;
  },

  async assessAttempt(input: {
    userId: number;
    promptId: number;
    userAnswerText: string;
  }): Promise<CollocationAttemptRecord> {
    const prompt = await collocationRepository.findPromptInternalById({ promptId: input.promptId });
    if (!prompt) {
      throw new AppError(404, "COLLOCATION_PROMPT_NOT_FOUND", API_MESSAGES.errors.collocationPromptNotFound);
    }
    const hasViewed = await collocationRepository.hasUserViewedPrompt({
      userId: input.userId,
      promptId: input.promptId
    });
    if (!hasViewed) {
      throw new AppError(404, "COLLOCATION_PROMPT_NOT_FOUND", API_MESSAGES.errors.collocationPromptNotFound);
    }

    const { profileText } = await buildLearnerContext(input.userId);
    const isSkipAnswer = isIDontKnowAnswer(input.userAnswerText);
    const assessment = await assessCollocationAttempt({
      germanText: prompt.germanText,
      englishText: prompt.englishText,
      clozeSentence: prompt.clozeSentence,
      clozeAnswer: prompt.clozeAnswer,
      userAnswerText: input.userAnswerText,
      learnerProfile: profileText
    });
    if (isSkipAnswer) {
      assessment.feedback = "";
      assessment.score = 0;
      assessment.correctVersion = prompt.clozeAnswer;
    }

    const created = await collocationRepository.createAttempt({
      userId: input.userId,
      promptId: input.promptId,
      germanText: prompt.germanText,
      englishText: prompt.englishText,
      clozeSentence: prompt.clozeSentence,
      userAnswerText: input.userAnswerText,
      score: Math.round(assessment.score),
      feedback: assessment.feedback,
      correctVersion: assessment.correctVersion,
      alternatives: assessment.alternatives
    });

    if (shouldEnqueueForReview(created.score)) {
      await collocationReviewRepository.upsertLowScoreItem({
        userId: input.userId,
        germanText: created.germanText,
        englishText: created.englishText,
        clozeSentence: created.clozeSentence,
        score: created.score,
        baselineCorrectVersion: created.correctVersion,
        baselineAlternatives: created.alternatives,
        baselineFeedback: created.feedback
      });
    }

    await dailyGoalService.recordGoalProgress(input.userId);
    return created;
  },

  async listHistory(input: { userId: number; limit?: number; offset?: number }): Promise<{
    items: CollocationAttemptRecord[];
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
      collocationRepository.listAttempts({ userId: input.userId, limit, offset }),
      collocationRepository.countAttempts({ userId: input.userId })
    ]);
    const historyByCollocation = await collocationRepository.listAttemptHistoryByGermanTexts({
      userId: input.userId,
      germanTexts: items.map((item) => item.germanText)
    });
    const itemsWithHistory = items.map((item) => ({
      ...item,
      attemptHistory: historyByCollocation[item.germanText] ?? []
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

  async listDueReviewItems(input: { userId: number; limit?: number }): Promise<{
    dueCount: number;
    items: CollocationReviewItemRecord[];
  }> {
    const [dueCount, items] = await Promise.all([
      collocationReviewRepository.countDueItems(input.userId),
      collocationReviewRepository.listDueItems({ userId: input.userId, limit: input.limit ?? 50 })
    ]);
    return { dueCount, items };
  },

  async assessReviewAttempt(input: {
    userId: number;
    reviewItemId: number;
    userAnswerText: string;
  }): Promise<CollocationReviewAssessmentRecord> {
    const item = await collocationReviewRepository.findById({
      userId: input.userId,
      reviewItemId: input.reviewItemId
    });

    if (!item) {
      throw new AppError(404, "COLLOCATION_REVIEW_ITEM_NOT_FOUND", API_MESSAGES.errors.collocationReviewItemNotFound);
    }

    const dueAtMs = new Date(item.nextReviewAt).getTime();
    if (Number.isFinite(dueAtMs) && dueAtMs > Date.now()) {
      throw new AppError(409, "COLLOCATION_REVIEW_ITEM_NOT_DUE", API_MESSAGES.errors.collocationReviewItemNotDue, {
        nextReviewAt: item.nextReviewAt
      });
    }

    const reviewAssessment = await assessCollocationReviewAttempt({
      germanText: item.germanText,
      englishText: item.englishText,
      clozeSentence: item.clozeSentence,
      baselineCorrectVersion: item.baselineCorrectVersion,
      userAnswerText: input.userAnswerText
    });

    const roundedScore = Math.round(reviewAssessment.score);
    const now = new Date();
    const transition = computeReviewTransition(item, roundedScore, now);

    const updated = await collocationReviewRepository.saveReviewProgress({
      userId: input.userId,
      reviewItemId: input.reviewItemId,
      score: roundedScore,
      successCount: transition.successCount,
      reviewAttemptCount: item.reviewAttemptCount + 1,
      nextReviewAt: transition.nextReviewAt,
      status: transition.status
    });

    if (!updated) {
      throw new AppError(404, "COLLOCATION_REVIEW_ITEM_NOT_FOUND", API_MESSAGES.errors.collocationReviewItemNotFound);
    }

    // Mirror review attempts into regular collocation history so the history
    // card reflects the latest percentage across retries (same as Alltag).
    const reviewPrompt = await collocationRepository.createPrompt({
      userId: input.userId,
      germanText: item.germanText,
      englishText: item.englishText,
      clozeSentence: item.clozeSentence,
      clozeAnswer: item.baselineCorrectVersion,
      collocationType: "review_retry",
      generationCategory: "review"
    });
    await collocationRepository.markPromptViewed({ userId: input.userId, promptId: reviewPrompt.id });
    await collocationRepository.createAttempt({
      userId: input.userId,
      promptId: reviewPrompt.id,
      germanText: item.germanText,
      englishText: item.englishText,
      clozeSentence: item.clozeSentence,
      userAnswerText: input.userAnswerText,
      score: roundedScore,
      feedback: reviewAssessment.feedback,
      correctVersion: item.baselineCorrectVersion,
      alternatives: item.baselineAlternatives
    });

    return {
      reviewItem: updated,
      score: roundedScore,
      feedback: reviewAssessment.feedback
    };
  }
};

const isIDontKnowAnswer = (text: string): boolean => {
  const normalized = text.trim().toLowerCase();
  return normalized === "i don't know." || normalized === "i don't know" || normalized === "idk";
};
