export interface SrsStateInput {
  srsIntervalDays: number;
  srsEaseFactor: number;
  srsReviewCount: number;
}

export interface NextSrsState {
  nextIntervalDays: number;
  nextEaseFactor: number;
  incrementLapse: boolean;
}

export const ratingToQuality = (rating: number): number => {
  return Math.max(0, Math.min(5, rating + 1));
};

export const computeNextSrsState = (current: SrsStateInput, rating: number): NextSrsState => {
  const quality = ratingToQuality(rating);
  const oldEase = current.srsEaseFactor || 2.5;
  const nextEase = Math.max(1.3, oldEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  let nextIntervalDays: number;
  let incrementLapse = false;

  if (rating <= 1) {
    nextIntervalDays = 1;
    incrementLapse = true;
  } else if (current.srsReviewCount === 0) {
    nextIntervalDays = rating >= 4 ? 4 : 2;
  } else if (current.srsIntervalDays <= 1) {
    nextIntervalDays = rating >= 4 ? 4 : 3;
  } else {
    const base = current.srsIntervalDays * nextEase;
    if (rating === 2) {
      nextIntervalDays = Math.max(2, Math.round(base * 0.85));
    } else if (rating === 3) {
      nextIntervalDays = Math.max(2, Math.round(base));
    } else {
      nextIntervalDays = Math.max(3, Math.round(base * 1.3));
    }
  }

  return {
    nextIntervalDays,
    nextEaseFactor: Number(nextEase.toFixed(2)),
    incrementLapse
  };
};
