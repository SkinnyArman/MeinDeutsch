import type { ExpressionReviewItemRecord } from "../models/expression-review-item.model.js";

export const REVIEW_ENQUEUE_THRESHOLD = 70;
export const REVIEW_SUCCESS_SCORE = 90;
export const REVIEW_FOLLOW_UP_DAYS = 7;
export const REVIEW_RETRY_DAYS = 1;

export interface ReviewTransition {
  successCount: number;
  status: "active" | "graduated";
  nextReviewAt: Date | null;
}

const plusDays = (base: Date, days: number): Date => {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
};

export const shouldEnqueueForReview = (naturalnessScore: number): boolean => {
  return naturalnessScore <= REVIEW_ENQUEUE_THRESHOLD;
};

export const computeReviewTransition = (
  item: Pick<ExpressionReviewItemRecord, "successCount">,
  roundedScore: number,
  now: Date
): ReviewTransition => {
  let successCount = item.successCount;
  let status: "active" | "graduated" = "active";
  let nextReviewAt: Date | null = plusDays(now, REVIEW_RETRY_DAYS);

  if (roundedScore >= REVIEW_SUCCESS_SCORE) {
    successCount += 1;
    if (successCount >= 2) {
      status = "graduated";
    } else {
      nextReviewAt = plusDays(now, REVIEW_FOLLOW_UP_DAYS);
    }
  } else {
    successCount = 0;
    nextReviewAt = plusDays(now, REVIEW_RETRY_DAYS);
  }

  return { successCount, status, nextReviewAt };
};
