import test from "node:test";
import assert from "node:assert/strict";

import { isStreakAlive } from "../repositories/streak.repository.js";

const now = new Date("2026-06-12T10:00:00Z");

test("streak alive when last completion is today", () => {
  assert.equal(isStreakAlive("2026-06-12", now), true);
});

test("streak alive when last completion is yesterday", () => {
  assert.equal(isStreakAlive("2026-06-11", now), true);
});

test("streak broken when last completion is two+ days ago", () => {
  assert.equal(isStreakAlive("2026-06-10", now), false);
  assert.equal(isStreakAlive("2026-06-06", now), false);
});

test("streak broken when there is no completion yet", () => {
  assert.equal(isStreakAlive(null, now), false);
});
