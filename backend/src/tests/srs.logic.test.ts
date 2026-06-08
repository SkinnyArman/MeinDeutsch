import test from "node:test";
import assert from "node:assert/strict";

import { VOCABULARY_REVIEW_RATINGS } from "../contracts/api-types.js";
import {
  AGAIN_RELEARNING_MINUTES,
  computeNextSrsState
} from "../logic/srs.logic.js";

test("SRS: new cards use distinct learning intervals", () => {
  const current = {
    srsIntervalDays: 0,
    srsEaseFactor: 2.5,
    srsReviewCount: 0
  };

  const hard = computeNextSrsState(current, VOCABULARY_REVIEW_RATINGS.HARD);
  const good = computeNextSrsState(current, VOCABULARY_REVIEW_RATINGS.GOOD);
  const easy = computeNextSrsState(current, VOCABULARY_REVIEW_RATINGS.EASY);

  assert.equal(hard.nextIntervalDays, 1);
  assert.equal(good.nextIntervalDays, 3);
  assert.equal(easy.nextIntervalDays, 7);
});

test("SRS: again rating schedules a short relearning step", () => {
  const next = computeNextSrsState(
    {
      srsIntervalDays: 10,
      srsEaseFactor: 2.3,
      srsReviewCount: 7
    },
    VOCABULARY_REVIEW_RATINGS.AGAIN
  );

  assert.equal(next.nextIntervalDays, 0);
  assert.equal(next.nextDelayMinutes, AGAIN_RELEARNING_MINUTES);
  assert.equal(next.incrementLapse, true);
});

test("SRS: again on a new card is not counted as a lapse", () => {
  const next = computeNextSrsState(
    {
      srsIntervalDays: 0,
      srsEaseFactor: 2.5,
      srsReviewCount: 0
    },
    VOCABULARY_REVIEW_RATINGS.AGAIN
  );

  assert.equal(next.incrementLapse, false);
});

test("SRS: easy rating grows interval for learned cards", () => {
  const next = computeNextSrsState(
    {
      srsIntervalDays: 10,
      srsEaseFactor: 2.5,
      srsReviewCount: 5
    },
    VOCABULARY_REVIEW_RATINGS.EASY
  );

  assert.ok(next.nextIntervalDays >= 20);
  assert.equal(next.incrementLapse, false);
});
