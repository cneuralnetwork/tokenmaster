import { test } from "node:test";
import assert from "node:assert/strict";
import { createEngine } from "../src/server/engine.ts";
test("upstream engine returns an offline unified JSON report", async () => {
  const engine = createEngine();
  const report = await engine.report({
    since: "2099-01-01",
    until: "2099-01-02",
    timezone: "UTC",
  });
  assert.deepEqual(report.daily, []);
  assert.equal(report.totals.totalTokens, 0);
  engine.close();
});
