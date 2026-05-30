import test from "node:test";
import assert from "node:assert/strict";

import { isGoogleUpstreamFailure } from "../services/auth.service.js";

test("isGoogleUpstreamFailure detects google cert endpoint 403", () => {
  const err = {
    response: {
      status: 403,
      config: {
        url: "https://www.googleapis.com/oauth2/v1/certs"
      }
    }
  };

  assert.equal(isGoogleUpstreamFailure(err), true);
});

test("isGoogleUpstreamFailure detects network timeout-style messages", () => {
  const err = { message: "connect ETIMEDOUT" };
  assert.equal(isGoogleUpstreamFailure(err), true);
});

test("isGoogleUpstreamFailure ignores ordinary auth errors", () => {
  const err = {
    response: {
      status: 401,
      config: { url: "https://oauth2.googleapis.com/tokeninfo" }
    },
    message: "invalid token"
  };

  assert.equal(isGoogleUpstreamFailure(err), false);
});
