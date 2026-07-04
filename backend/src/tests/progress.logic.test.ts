import test from "node:test";
import assert from "node:assert/strict";

import { computeReadiness, nextLevelOf } from "../logic/progress.logic.js";

test("nextLevelOf steps up the ladder and caps at C2", () => {
  assert.equal(nextLevelOf("A2"), "B1");
  assert.equal(nextLevelOf("B1"), "B2");
  assert.equal(nextLevelOf("C2"), null);
  assert.equal(nextLevelOf(null), null);
});

test("readiness is 0 with no data", () => {
  const r = computeReadiness({ currentLevel: "B1", recentScores: [], recentAnswerLevels: [], activeDaysLast14: 0 });
  assert.equal(r.percent, 0);
});

test("strong signals across all three dimensions give high readiness", () => {
  const r = computeReadiness({
    currentLevel: "B1",
    recentScores: [90, 95, 88, 92],
    recentAnswerLevels: ["B1", "B2", "B1", "B2"],
    activeDaysLast14: 12
  });
  assert.ok(r.percent >= 85, `expected high readiness, got ${r.percent}`);
  assert.equal(r.breakdown.production, 100);
  assert.equal(r.breakdown.consistency, 100);
});

test("weak accuracy drags readiness down even with good consistency", () => {
  const strong = computeReadiness({
    currentLevel: "B1",
    recentScores: [90, 90],
    recentAnswerLevels: ["B1"],
    activeDaysLast14: 12
  });
  const weak = computeReadiness({
    currentLevel: "B1",
    recentScores: [40, 45],
    recentAnswerLevels: ["B1"],
    activeDaysLast14: 12
  });
  assert.ok(weak.percent < strong.percent);
});
