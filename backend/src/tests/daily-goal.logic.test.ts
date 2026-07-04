import test from "node:test";
import assert from "node:assert/strict";

import { DAILY_GOAL_TARGET, computeDailyGoalSteps, countCompleted, isDailyGoalComplete } from "../logic/daily-goal.logic.js";

test("target is below the number of sections (achievable in one sitting)", () => {
  assert.ok(DAILY_GOAL_TARGET < 5);
});

test("goal completes once TARGET sections are done, not all of them", () => {
  // 3 real sections done, 2 not → still complete at target 3.
  const steps = computeDailyGoalSteps({
    countsToday: { dailyTalk: 1, alltagssprache: 1, kollokationen: 1, vocabulary: 0, gespraech: 0 },
    vocabularyDueNow: 5
  });
  assert.equal(countCompleted(steps), 3);
  assert.equal(isDailyGoalComplete(steps), true);
});

test("goal is incomplete below target", () => {
  const steps = computeDailyGoalSteps({
    countsToday: { dailyTalk: 1, alltagssprache: 0, kollokationen: 0, vocabulary: 0, gespraech: 0 },
    vocabularyDueNow: 5
  });
  // dailyTalk done (1) + vocabulary auto-done (queue... 5 due so NOT auto) = 1 done.
  assert.equal(countCompleted(steps), 1);
  assert.equal(isDailyGoalComplete(steps), false);
});

test("vocabulary counts as done when nothing is due (contributes toward target)", () => {
  const steps = computeDailyGoalSteps({
    countsToday: { dailyTalk: 1, alltagssprache: 1, kollokationen: 0, vocabulary: 0, gespraech: 0 },
    vocabularyDueNow: 0
  });
  // dailyTalk + alltag + vocabulary(auto) = 3 → complete.
  assert.equal(isDailyGoalComplete(steps), true);
});
