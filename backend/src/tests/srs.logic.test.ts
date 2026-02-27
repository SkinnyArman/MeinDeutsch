import test from "node:test";
import assert from "node:assert/strict";

import { computeNextSrsState } from "../logic/srs.logic.js";

test("SRS: first review with hard rating gives short interval", () => {
  const next = computeNextSrsState(
    {
      srsIntervalDays: 0,
      srsEaseFactor: 2.5,
      srsReviewCount: 0
    },
    2
  );

  assert.equal(next.nextIntervalDays, 2);
  assert.equal(next.incrementLapse, false);
  assert.ok(next.nextEaseFactor >= 1.3);
});

test("SRS: again rating resets interval and increments lapse", () => {
  const next = computeNextSrsState(
    {
      srsIntervalDays: 10,
      srsEaseFactor: 2.3,
      srsReviewCount: 7
    },
    1
  );

  assert.equal(next.nextIntervalDays, 1);
  assert.equal(next.incrementLapse, true);
});

test("SRS: easy rating grows interval for learned cards", () => {
  const next = computeNextSrsState(
    {
      srsIntervalDays: 10,
      srsEaseFactor: 2.5,
      srsReviewCount: 5
    },
    4
  );

  assert.ok(next.nextIntervalDays >= 20);
  assert.equal(next.incrementLapse, false);
});
