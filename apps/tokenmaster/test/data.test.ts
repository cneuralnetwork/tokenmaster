import { test } from "node:test";
import assert from "node:assert/strict";
import {
  csv,
  groupPeriod,
  zero,
  filterRows,
  modelRows,
  rangeQuery,
  previousQuery,
  tokens,
  usd,
} from "../src/ui/data.ts";
import { browserCommand } from "../src/server/browser.ts";
import type { UsageRow } from "../src/types.ts";
import { ReportCache } from "../src/server/cache.ts";
test("formatting retains cents and three significant token figures", () => {
  assert.equal(usd(1234.567), "$1,234.57");
  assert.equal(tokens(1234567), "1.23M");
});
test("inclusive date ranges and previous periods respect leap days", () => {
  assert.deepEqual(
    previousQuery({
      since: "2024-03-01",
      until: "2024-03-07",
      timezone: "UTC",
    }),
    { since: "2024-02-23", until: "2024-02-29", timezone: "UTC" },
  );
  assert.equal(
    rangeQuery("custom", "UTC", "2026-01-02", "2026-01-03").since,
    "2026-01-02",
  );
});
test("CSV escapes embedded quotes and neutralizes spreadsheet formulas", () => {
  const content = csv([{ name: "=1+1", model: 'a"b', cost: 1.25 }]);
  assert.match(content, /'=1\+1/);
  assert.match(content, /a""b/);
  assert.match(content, /1.25/);
});
test("model selection does not double count cached input or repeat total agent cost", () => {
  const child: UsageRow = {
    agent: "codex",
    period: "2026-01-01",
    inputTokens: 15,
    outputTokens: 5,
    cacheCreationTokens: 0,
    cacheReadTokens: 80,
    totalTokens: 100,
    totalCost: 2,
    modelsUsed: ["a", "b"],
    modelBreakdowns: [
      {
        modelName: "a",
        inputTokens: 10,
        outputTokens: 5,
        cacheCreationTokens: 0,
        cacheReadTokens: 80,
        cost: 1.5,
      },
      {
        modelName: "b",
        inputTokens: 5,
        outputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        cost: 0.5,
      },
    ],
  };
  const parent = { ...child, agent: "all", agents: [child] };
  const rows = filterRows([parent], "codex", "a");
  assert.equal(rows[0]!.totalTokens, 95);
  assert.equal(rows[0]!.totalCost, 1.5);
  assert.equal(modelRows([child]).length, 2);
});
for (const platform of ["linux", "darwin", "win32"] as const)
  test(`browser command is an argument-safe launcher on ${platform}`, () => {
    const [cmd, args] = browserCommand("http://127.0.0.1:4317", platform);
    assert.ok(cmd);
    assert.ok(args.includes("http://127.0.0.1:4317"));
    assert.ok(!args.includes("-c"));
  });
test("cache coalesces concurrent reads and serializes large jobs", async () => {
  const cache = new ReportCache();
  let calls = 0;
  const load = async () => {
    calls++;
    return { value: 42 };
  };
  const [a, b] = await Promise.all([
    cache.get("x", load),
    cache.get("x", load),
  ]);
  assert.equal(calls, 1);
  assert.equal(a, b);
  await cache.get("x", load, true);
  assert.equal(calls, 2);
});

test("period drill-down merges every source model without losing costs", () => {
  const model = {
    modelName: "same-model",
    inputTokens: 10,
    outputTokens: 5,
    cacheCreationTokens: 2,
    cacheReadTokens: 20,
    cost: 1.2,
  };
  const first: UsageRow = {
    ...zero(),
    agent: "claude",
    period: "2026-01",
    totalTokens: 37,
    totalCost: 1.2,
    modelsUsed: [model.modelName],
    modelBreakdowns: [model],
  };
  const second = { ...first, agent: "codex" };
  const result = groupPeriod([first, second])[0]!;
  assert.equal(result.totalTokens, 74);
  assert.equal(result.totalCost, 2.4);
  assert.equal(result.modelBreakdowns.length, 1);
  assert.equal(result.modelBreakdowns[0]!.cost, 2.4);
  assert.equal(result.modelBreakdowns[0]!.cacheReadTokens, 40);
  assert.equal(model.cost, 1.2);
});
