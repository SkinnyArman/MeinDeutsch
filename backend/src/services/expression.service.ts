import { assessExpressionAttempt, assessExpressionReviewAttempt, generateEverydayExpression } from "../ai/analysis.client.js";
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
  async generatePrompt(userId: number): Promise<ExpressionPromptRecord> {
    const generated = await generateEverydayExpression();
    return expressionRepository.createPrompt({
      userId,
      englishText: generated.englishText,
      generatedContext: generated.generatedContext
    });
  },

  async assessAttempt(input: {
    userId: number;
    promptId: number;
    userAnswerText: string;
  }): Promise<ExpressionAttemptRecord> {
    const prompt = await expressionRepository.findPromptById({
      userId: input.userId,
      promptId: input.promptId
    });
    if (!prompt) {
      throw new AppError(404, "EXPRESSION_PROMPT_NOT_FOUND", API_MESSAGES.errors.expressionPromptNotFound);
    }

    const assessment = await assessExpressionAttempt({
      englishText: prompt.englishText,
      userAnswerText: input.userAnswerText
    });

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
      generatedContext: "review_retry"
    });
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
