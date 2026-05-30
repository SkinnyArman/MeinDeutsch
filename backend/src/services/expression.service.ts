import {
  assessExpressionAttempt,
  assessExpressionReviewAttempt,
  generateEverydayExpression,
  type ExpressionGenerationCategory
} from "../ai/analysis.client.js";
import { API_MESSAGES } from "../constants/api-messages.js";
import type { ExpressionAttemptRecord } from "../models/expression-attempt.model.js";
import type { ExpressionPromptRecord } from "../models/expression-prompt.model.js";
import type { ExpressionReviewItemRecord } from "../models/expression-review-item.model.js";
import {
  computeReviewTransition,
  shouldEnqueueForReview
} from "../logic/expression-review.logic.js";
import { expressionReviewRepository } from "../repositories/expression-review.repository.js";
import { expressionRepository } from "../repositories/expression.repository.js";
import { AppError } from "../utils/app-error.js";

export interface ExpressionReviewAssessmentRecord {
  reviewItem: ExpressionReviewItemRecord;
  naturalnessScore: number;
  feedback: string;
}

export const expressionService = {
  async generatePrompt(userId: number, category: ExpressionGenerationCategory): Promise<ExpressionPromptRecord> {
    const prompts = await this.generatePromptPool({
      userId,
      categories: [category],
      countPerCategory: 5
    });
    const first = prompts.promptsByCategory[category]?.[0] ?? null;
    if (!first) {
      throw new AppError(500, "EXPRESSION_PROMPT_NOT_FOUND", API_MESSAGES.errors.expressionPromptNotFound);
    }
    return first;
  },
  async getNextPrompt(input: { userId: number; category: ExpressionGenerationCategory }): Promise<ExpressionPromptRecord> {
    let unseen = await expressionRepository.listUnseenPromptsByCategory({
      userId: input.userId,
      category: input.category,
      limit: 1
    });

    if (unseen.length === 0) {
      await this.generatePromptPool({
        userId: input.userId,
        categories: [input.category],
        countPerCategory: 5
      });
      unseen = await expressionRepository.listUnseenPromptsByCategory({
        userId: input.userId,
        category: input.category,
        limit: 1
      });
    }

    let nextPrompt = unseen[0];
    if (!nextPrompt) {
      const fallbackPool = await expressionRepository.listPromptsByCategory({
        category: input.category,
        limit: 1
      });
      nextPrompt = fallbackPool[0];
    }
    if (!nextPrompt) {
      throw new AppError(500, "EXPRESSION_PROMPT_NOT_FOUND", API_MESSAGES.errors.expressionPromptNotFound);
    }

    await expressionRepository.markPromptViewed({ userId: input.userId, promptId: nextPrompt.id });
    return nextPrompt;
  },
  async generatePromptPool(input: {
    userId: number;
    categories: ExpressionGenerationCategory[];
    countPerCategory: number;
  }): Promise<{ promptsByCategory: Record<string, ExpressionPromptRecord[]>; countPerCategory: number; categories: string[] }> {
    const promptsByCategory: Record<string, ExpressionPromptRecord[]> = {};

    for (const category of input.categories) {
      const prompts: ExpressionPromptRecord[] = [];
      const seenIds = new Set<number>();
      let attempts = 0;
      const maxAttempts = input.countPerCategory * 8;
      while (prompts.length < input.countPerCategory && attempts < maxAttempts) {
        attempts += 1;
        const generated = await generateEverydayExpression(category);
        const created = await expressionRepository.createPrompt({
          userId: input.userId,
          englishText: generated.englishText,
          generatedContext: generated.generatedContext,
          generationCategory: category
        });
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

    const isSkipAnswer = isIDontKnowAnswer(input.userAnswerText);
    const assessment = await assessExpressionAttempt({
      englishText: prompt.englishText,
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
      alternatives: assessment.alternatives
    });

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
