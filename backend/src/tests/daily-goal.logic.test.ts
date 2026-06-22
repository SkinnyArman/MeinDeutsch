import test from "node:test";
import assert from "node:assert/strict";

import { computeDailyGoalSteps, isDailyGoalComplete } from "../logic/daily-goal.logic.js";

test("goal is incomplete when any section has no activity", () => {
  const steps = computeDailyGoalSteps({
    countsToday: { dailyTalk: 1, alltagssprache: 2, kollokationen: 0, vocabulary: 1, gespraech: 1 },
    vocabularyDueNow: 3
  });
  assert.equal(isDailyGoalComplete(steps), false);
  assert.deepEqual(
    steps.map((step) => step.done),
    [true, true, false, true, true]
  );
});

test("goal completes when every section has at least one task", () => {
  const steps = computeDailyGoalSteps({
    countsToday: { dailyTalk: 1, alltagssprache: 1, kollokationen: 1, vocabulary: 1, gespraech: 1 },
    vocabularyDueNow: 5
  });
  assert.equal(isDailyGoalComplete(steps), true);
});

test("vocabulary counts as done when nothing is due, but not otherwise", () => {
  const emptyQueue = computeDailyGoalSteps({
    countsToday: { dailyTalk: 1, alltagssprache: 1, kollokationen: 1, vocabulary: 0, gespraech: 1 },
    vocabularyDueNow: 0
  });
  assert.equal(isDailyGoalComplete(emptyQueue), true);

  const pendingQueue = computeDailyGoalSteps({
    countsToday: { dailyTalk: 1, alltagssprache: 1, kollokationen: 1, vocabulary: 0, gespraech: 1 },
    vocabularyDueNow: 2
  });
  assert.equal(isDailyGoalComplete(pendingQueue), false);
});

test("goal is incomplete when gespraech has no activity", () => {
  const steps = computeDailyGoalSteps({
    countsToday: { dailyTalk: 1, alltagssprache: 1, kollokationen: 1, vocabulary: 1, gespraech: 0 },
    vocabularyDueNow: 0
  });
  assert.equal(isDailyGoalComplete(steps), false);
});
