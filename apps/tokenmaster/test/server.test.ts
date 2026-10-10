import { test } from "node:test";
import { get } from "node:http";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { startServer } from "../src/server/server.ts";
import { enginePath, queryArgs } from "../src/server/engine.ts";
import { fixture } from "./fixtures.ts";
import type { Envelope, Report } from "../src/types.ts";
const exec = promisify(execFile);
const publicDir = fileURLToPath(new URL("../dist/public", import.meta.url));
test("API is identical to upstream for Claude, Codex, OpenCode and upstream Copilot fixtures", async () => {
  const f = await fixture();
  const app = await startServer({ port: 0, env: f.env, publicDir });
  try {
    const query = { since: "2026-01-01", until: "2026-02-28", timezone: "UTC" };
    const { stdout } = await exec(
      enginePath(),
      [
        "daily",
        "--sections",
        "daily,weekly,monthly,session",
        "--by-agent",
        ...queryArgs(query),
      ],
      { env: f.env, maxBuffer: 16e6 },
    );
    const response = await fetch(
      `${app.url}/api/report?${new URLSearchParams(query)}`,
    );
    assert.equal(response.status, 200);
    const api = (await response.json()) as Envelope<Report>;
    assert.deepEqual(api.data, JSON.parse(stdout));
    const agents = new Set(
      api.data.daily.flatMap((r) => r.agents?.map((a) => a.agent) ?? []),
    );
    assert.deepEqual([...agents].sort(), [
      "claude",
      "codex",
      "copilot",
      "opencode",
    ]);
    const claude = api.data.daily
      .flatMap((r) => r.agents ?? [])
      .find((r) => r.agent === "claude")!;
    assert.equal(claude.inputTokens, 1000);
    assert.equal(claude.outputTokens, 200);
    assert.equal(claude.cacheCreationTokens, 300);
    assert.equal(claude.cacheReadTokens, 400);
    assert.equal(claude.totalTokens, 1900);
    assert.equal(claude.totalCost, 0.123);
    for (const [route, args] of [
      ["blocks", ["blocks"]],
      ["projects", ["claude", "daily", "--instances"]],
    ] as const) {
      const raw = await exec(enginePath(), [...args, ...queryArgs(query)], {
        env: f.env,
      });
      const data = await (
        await fetch(`${app.url}/api/${route}?${new URLSearchParams(query)}`)
      ).json();
      assert.deepEqual(data.data, JSON.parse(raw.stdout));
    }
    assert.equal(
      JSON.stringify(api).includes("private prompt must not appear"),
      false,
    );
    const cached = await (
      await fetch(`${app.url}/api/report?${new URLSearchParams(query)}`)
    ).json();
    assert.equal(cached.readAt, api.readAt);
  } finally {
    await app.close();
    await f.cleanup();
  }
});
test("empty directories return true zeros, packaged frontend and fonts are served locally", async () => {
  const f = await fixture(true);
  const app = await startServer({ port: 0, env: f.env, publicDir });
  try {
    const response = await fetch(`${app.url}/api/report`);
    assert.equal(response.status, 200);
    const api = await response.json();
    assert.equal(api.data.totals.totalTokens, 0);
    assert.deepEqual(api.data.daily, []);
    assert.deepEqual(api.data.session, []);
    const html = await fetch(app.url);
    assert.equal(html.status, 200);
    assert.match(await html.text(), /assets\//);
    assert.match(
      html.headers.get("content-security-policy")!,
      /connect-src 'self'/,
    );
  } finally {
    await app.close();
    await f.cleanup();
  }
});
test("rejects cross-origin reads, invalid dates, methods and filesystem traversal", async () => {
  const f = await fixture(true);
  const app = await startServer({ port: 0, env: f.env, publicDir });
  try {
    assert.equal(
      (
        await fetch(`${app.url}/api/report`, {
          headers: { Origin: "https://evil.example" },
        })
      ).status,
      403,
    );
    assert.equal(
      await new Promise((resolve) =>
        get(
          `${app.url}/api/report`,
          { headers: { Host: "evil.example" } },
          (r) => {
            r.resume();
            resolve(r.statusCode);
          },
        ),
      ),
      403,
    );
    assert.equal(
      (await fetch(`${app.url}/api/report?since=2026-02-31`)).status,
      400,
    );
    assert.equal(
      (await fetch(`${app.url}/api/report?since=2026-02-01&until=2026-01-01`))
        .status,
      400,
    );
    assert.equal(
      (await fetch(`${app.url}/api/report?timezone=Invalid`)).status,
      400,
    );
    assert.equal((await fetch(`${app.url}/api/report?mode=evil`)).status, 400);
    assert.equal((await fetch(`${app.url}/api/report?command=rm`)).status, 400);
    assert.equal(
      (await fetch(`${app.url}/api/report`, { method: "POST" })).status,
      405,
    );
    assert.equal(
      (await fetch(`${app.url}/..%2f..%2fpackage.json`)).status,
      403,
    );
  } finally {
    await app.close();
    await f.cleanup();
  }
});
test("port conflict selects the next free loopback port; clean shutdown releases it", async () => {
  const f = await fixture(true);
  const first = await startServer({ port: 0, env: f.env, publicDir });
  const second = await startServer({ port: first.port, env: f.env, publicDir });
  try {
    assert.notEqual(first.port, second.port);
    assert.equal(
      first.server.address() && typeof first.server.address() === "object"
        ? (first.server.address() as { address: string }).address
        : "",
      "127.0.0.1",
    );
    await second.close();
    const replacement = await startServer({
      port: second.port,
      env: f.env,
      publicDir,
    });
    assert.equal(replacement.port, second.port);
    await replacement.close();
  } finally {
    await first.close();
    await f.cleanup();
  }
});
test("forced refresh picks up an appended log without restarting", async () => {
  const f = await fixture(true);
  const app = await startServer({
    port: 0,
    env: f.env,
    publicDir,
    cacheTtl: 60000,
  });
  try {
    const first = await (await fetch(`${app.url}/api/report`)).json();
    assert.equal(first.data.totals.totalTokens, 0);
    await f.put(
      ".claude/projects/live/new.jsonl",
      JSON.stringify({
        timestamp: "2026-01-02T12:00:00Z",
        message: {
          id: "msg_live",
          model: "claude-sonnet-4-20250514",
          usage: { input_tokens: 100, output_tokens: 20 },
        },
        costUSD: 0.1,
      }) + "\n",
    );
    const next = await (await fetch(`${app.url}/api/report?refresh=1`)).json();
    assert.equal(next.data.totals.totalTokens, 120);
    assert.equal(next.data.totals.totalCost, 0.1);
  } finally {
    await app.close();
    await f.cleanup();
  }
});
