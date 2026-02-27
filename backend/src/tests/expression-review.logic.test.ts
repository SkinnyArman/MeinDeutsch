import test from "node:test";
import assert from "node:assert/strict";

import {
  REVIEW_SUCCESS_SCORE,
  computeReviewTransition,
  shouldEnqueueForReview
} from "../logic/expression-review.logic.js";

test("review enqueue: score <= 70 is enqueued", () => {
  assert.equal(shouldEnqueueForReview(70), true);
  assert.equal(shouldEnqueueForReview(69), true);
  assert.equal(shouldEnqueueForReview(71), false);
});

test("review transition: score below threshold resets success count", () => {
  const now = new Date("2026-02-27T10:00:00.000Z");
  const transition = computeReviewTransition({ successCount: 1 }, REVIEW_SUCCESS_SCORE - 1, now);

  assert.equal(transition.successCount, 0);
  assert.equal(transition.status, "active");
  assert.ok(transition.nextReviewAt);
  assert.equal(transition.nextReviewAt?.toISOString(), "2026-02-28T10:00:00.000Z");
});

test("review transition: first success schedules follow-up", () => {
  const now = new Date("2026-02-27T10:00:00.000Z");
  const transition = computeReviewTransition({ successCount: 0 }, REVIEW_SUCCESS_SCORE, now);

  assert.equal(transition.successCount, 1);
  assert.equal(transition.status, "active");
  assert.equal(transition.nextReviewAt?.toISOString(), "2026-03-06T10:00:00.000Z");
});

test("review transition: second success graduates item", () => {
  const now = new Date("2026-02-27T10:00:00.000Z");
  const transition = computeReviewTransition({ successCount: 1 }, 100, now);

  assert.equal(transition.successCount, 2);
  assert.equal(transition.status, "graduated");
  assert.equal(transition.nextReviewAt?.toISOString(), "2026-02-28T10:00:00.000Z");
});
