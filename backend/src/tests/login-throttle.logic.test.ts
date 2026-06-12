import test from "node:test";
import assert from "node:assert/strict";

import { createLoginThrottle } from "../logic/login-throttle.js";

test("locks after max consecutive failures and unlocks after the window", () => {
  const throttle = createLoginThrottle({ maxFailures: 3, lockMs: 60_000 });
  const t0 = new Date("2026-06-12T10:00:00Z");

  throttle.recordFailure("a@b.c", t0);
  throttle.recordFailure("a@b.c", t0);
  assert.equal(throttle.isLocked("a@b.c", t0), false);

  throttle.recordFailure("a@b.c", t0);
  assert.equal(throttle.isLocked("a@b.c", t0), true);

  const afterWindow = new Date(t0.getTime() + 61_000);
  assert.equal(throttle.isLocked("a@b.c", afterWindow), false);
});

test("successful reset clears the failure count", () => {
  const throttle = createLoginThrottle({ maxFailures: 3, lockMs: 60_000 });
  const t0 = new Date("2026-06-12T10:00:00Z");

  throttle.recordFailure("a@b.c", t0);
  throttle.recordFailure("a@b.c", t0);
  throttle.reset("a@b.c");
  throttle.recordFailure("a@b.c", t0);
  throttle.recordFailure("a@b.c", t0);
  assert.equal(throttle.isLocked("a@b.c", t0), false);
});

test("keys are throttled independently", () => {
  const throttle = createLoginThrottle({ maxFailures: 1, lockMs: 60_000 });
  const t0 = new Date("2026-06-12T10:00:00Z");

  throttle.recordFailure("a@b.c", t0);
  assert.equal(throttle.isLocked("a@b.c", t0), true);
  assert.equal(throttle.isLocked("x@y.z", t0), false);
});
