import {
  VOCABULARY_REVIEW_RATINGS,
  type VocabularyReviewRating
} from "../contracts/api-types.js";

export interface SrsStateInput {
  srsIntervalDays: number;
  srsEaseFactor: number;
  srsReviewCount: number;
}

export interface NextSrsState {
  nextIntervalDays: number;
  nextEaseFactor: number;
  incrementLapse: boolean;
  nextDelayMinutes: number;
}

const MINUTES_PER_DAY = 24 * 60;
export const AGAIN_RELEARNING_MINUTES = 10;

export const ratingToQuality = (rating: VocabularyReviewRating): number => {
  return Math.max(0, Math.min(5, rating + 1));
};

export const computeNextSrsState = (
  current: SrsStateInput,
  rating: VocabularyReviewRating
): NextSrsState => {
  const quality = ratingToQuality(rating);
  const oldEase = current.srsEaseFactor || 2.5;
  const nextEase = Math.max(1.3, oldEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  let nextIntervalDays: number;
  let incrementLapse = false;

  if (rating === VOCABULARY_REVIEW_RATINGS.AGAIN) {
    nextIntervalDays = 0;
    incrementLapse = current.srsReviewCount > 0;
  } else if (current.srsReviewCount === 0) {
    nextIntervalDays = {
      [VOCABULARY_REVIEW_RATINGS.HARD]: 1,
      [VOCABULARY_REVIEW_RATINGS.GOOD]: 3,
      [VOCABULARY_REVIEW_RATINGS.EASY]: 7
    }[rating];
  } else if (current.srsIntervalDays === 0) {
    nextIntervalDays = rating === VOCABULARY_REVIEW_RATINGS.HARD
      ? 1
      : rating === VOCABULARY_REVIEW_RATINGS.GOOD
        ? 3
        : 7;
  } else {
    const base = current.srsIntervalDays * nextEase;
    if (rating === VOCABULARY_REVIEW_RATINGS.HARD) {
      nextIntervalDays = Math.max(1, Math.round(current.srsIntervalDays * 1.2));
    } else if (rating === VOCABULARY_REVIEW_RATINGS.GOOD) {
      nextIntervalDays = Math.max(2, Math.round(base));
    } else {
      nextIntervalDays = Math.max(3, Math.round(base * 1.3));
    }
  }

  return {
    nextIntervalDays,
    nextEaseFactor: Number(nextEase.toFixed(2)),
    incrementLapse,
    nextDelayMinutes: rating === VOCABULARY_REVIEW_RATINGS.AGAIN
      ? AGAIN_RELEARNING_MINUTES
      : nextIntervalDays * MINUTES_PER_DAY
  };
};
