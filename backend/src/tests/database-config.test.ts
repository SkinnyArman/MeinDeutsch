import test from "node:test";
import assert from "node:assert/strict";

import { appDataSource } from "../db/pool.js";

test("database schema is migration-managed rather than synchronize-managed", () => {
  assert.equal(appDataSource.options.synchronize, false);
  assert.ok(Array.isArray(appDataSource.options.migrations));
  assert.ok(appDataSource.options.migrations.length > 0);
});
