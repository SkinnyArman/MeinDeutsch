import test from "node:test";
import assert from "node:assert/strict";

import {
  EXPRESSION_GENERATION_CATEGORIES,
  resolveExpressionGenerationTargets
} from "../ai/analysis.client.js";

test("expression categories include requested options", () => {
  const required = ["random", "work", "bus", "home", "slang", "concert", "school", "sprichwort"];
  for (const category of required) {
    assert.equal(EXPRESSION_GENERATION_CATEGORIES.includes(category as never), true);
  }
});

test("sprichwort category prefers proverb/idiom style", () => {
  for (let i = 0; i < 20; i += 1) {
    const { targetType } = resolveExpressionGenerationTargets("sprichwort");
    assert.equal(["proverb", "idiom"].includes(targetType), true);
  }
});

test("work category stays within work-related contexts", () => {
  const allowed = new Set(["work", "time_pressure", "stress", "conflict"]);
  for (let i = 0; i < 20; i += 1) {
    const { targetContext } = resolveExpressionGenerationTargets("work");
    assert.equal(allowed.has(targetContext), true);
  }
});
