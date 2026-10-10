import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  chmod,
} from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { once } from "node:events";
const exec = promisify(execFile);
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("Run through npm run test:package.");
const root = await mkdtemp(join(tmpdir(), "tokenmaster-package-"));
const clean = join(root, "clean");
await mkdir(clean);
const env = {
  ...process.env,
  HOME: clean,
  USERPROFILE: clean,
  XDG_CONFIG_HOME: join(clean, ".config"),
  XDG_DATA_HOME: join(clean, ".local/share"),
  npm_config_cache: join(root, "npm-cache"),
  npm_config_userconfig: join(root, "empty-npmrc"),
};
for (const key of Object.keys(env))
  if (
    /^(CLAUDE_CONFIG_DIR|CODEX_HOME|OPENCODE_DATA_DIR|AMP_DATA_DIR|DROID_SESSIONS_DIR|CODEBUFF_DATA_DIR|HERMES_HOME|PI_AGENT_DIR|GOOSE_PATH_ROOT|KILO_DATA_DIR|COPILOT_HOME|COPILOT_OTEL_FILE_EXPORTER_PATH|GEMINI_DATA_DIR|ANTIGRAVITY_DATA_DIR|KIMI_DATA_DIR|QWEN_DATA_DIR|OPENCLAW_DIR|GROK_HOME|ZCODE_HOME)$/.test(
      key,
    )
  )
    delete env[key];
await writeFile(join(root, "empty-npmrc"), "");
const { stdout: pack } = await exec(
  process.execPath,
  [npmCli, "pack", "--ignore-scripts", "--json", "--workspaces=false"],
  { maxBuffer: 2e6 },
);
const packed = JSON.parse(pack)[0];
const tarball = resolve(packed.filename);
assert.ok(packed.files.some((f) => f.path === "dist/public/index.html"));
assert.ok(packed.files.some((f) => f.path === "dist/upstream/cli.js"));
assert.ok(!packed.files.some((f) => f.path.startsWith("src/")));
const npxCli = join(dirname(npmCli), "npx-cli.js");
const { stdout: version, stderr } = await exec(
  process.execPath,
  [npxCli, "--yes", "--package", tarball, "tokenmaster", "--version"],
  { cwd: clean, env, timeout: 120000 },
);
assert.equal(version.trim(), "TokenMaster 0.1.0 · ccusage 20.0.28");
assert.ok(!stderr.includes("Unknown option"));
console.log(
  "PASS: clean-cache npx tarball execution and version; production frontend and unchanged upstream launcher included.",
);
const child = spawn(
  process.execPath,
  [
    npxCli,
    "--yes",
    "--package",
    tarball,
    "tokenmaster",
    "--no-open",
    "--port",
    "44317",
  ],
  {
    cwd: clean,
    env,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let output = "";
child.stdout.on("data", (b) => (output += b));
child.stderr.on("data", (b) => (output += b));
async function stop() {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const closed = once(child, "exit");
  if (process.platform === "win32")
    await exec("taskkill", ["/PID", String(child.pid), "/T", "/F"]);
  else process.kill(-child.pid, "SIGTERM");
  await closed;
}
try {
  const deadline = Date.now() + 30000;
  while (!output.includes("tokenmaster ready") && Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(output);
    await new Promise((r) => setTimeout(r, 100));
  }
  const url = output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
  assert.ok(url, output);
  const html = await fetch(url);
  assert.equal(html.status, 200);
  assert.match(await html.text(), /assets\//);
  const report = await (await fetch(url + "/api/report")).json();
  assert.equal(report.data.totals.totalTokens, 0);
  const health = await (await fetch(url + "/api/health")).json();
  assert.equal(health.engine, "20.0.28");
  assert.ok(!output.includes("Unknown option"), output);
  await stop();
  await assert.rejects(() => fetch(url + "/api/health"));
  console.log(
    "PASS: npx --no-open starts the bundled app, detects an empty home, and shuts down cleanly.",
  );
  // Exercise automatic discovery through the installed executable too.
  await mkdir(join(clean, ".claude/projects/smoke"), { recursive: true });
  await writeFile(
    join(clean, ".claude/projects/smoke/session.jsonl"),
    JSON.stringify({
      timestamp: "2026-01-02T12:00:00Z",
      message: {
        id: "msg_smoke",
        model: "claude-sonnet-4-20250514",
        usage: { input_tokens: 123, output_tokens: 45 },
      },
      costUSD: 0.75,
    }) + "\n",
  );
  const { stdout: daily } = await exec(
    process.execPath,
    [
      npxCli,
      "--yes",
      "--package",
      tarball,
      "tokenmaster",
      "daily",
      "--offline",
      "--json",
    ],
    { cwd: clean, env, timeout: 30000 },
  );
  const parsed = JSON.parse(daily);
  assert.equal(parsed.totals.totalTokens, 168);
  assert.equal(parsed.totals.totalCost, 0.75);
  for (const command of ["weekly", "monthly", "session", "blocks"]) {
    const { stdout } = await exec(
      process.execPath,
      [
        npxCli,
        "--yes",
        "--package",
        tarball,
        "tokenmaster",
        command,
        "--offline",
        "--json",
      ],
      { cwd: clean, env, timeout: 30000 },
    );
    assert.ok(JSON.parse(stdout));
  }
  console.log(
    "PASS: installed CLI discovers logs and preserves daily, weekly, monthly, session and blocks reports.",
  );
  if (process.platform !== "win32") {
    const bin = join(root, "bin");
    await mkdir(bin);
    const capture = join(root, "browser-url");
    const opener = join(
      bin,
      process.platform === "darwin" ? "open" : "xdg-open",
    );
    await writeFile(
      opener,
      '#!/usr/bin/env node\nrequire("node:fs").writeFileSync(process.env.TOKENMASTER_BROWSER_CAPTURE,process.argv[2]);\n',
    );
    await chmod(opener, 0o755);
    const automatic = spawn(
      process.execPath,
      [npxCli, "--yes", "--package", tarball, "tokenmaster"],
      {
        cwd: clean,
        env: {
          ...env,
          PATH: bin + ":" + env.PATH,
          TOKENMASTER_BROWSER_CAPTURE: capture,
        },
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    try {
      let url = "";
      const end = Date.now() + 30000;
      while (!url && Date.now() < end) {
        try {
          url = await readFile(capture, "utf8");
        } catch {}
        if (!url) await new Promise((r) => setTimeout(r, 100));
      }
      assert.match(url, /^http:\/\/127\.0\.0\.1:\d+$/);
      assert.equal((await fetch(url + "/api/health")).status, 200);
      console.log(
        "PASS: no-argument npx launches the server and invokes the platform browser opener with its real URL.",
      );
    } finally {
      const exited = once(automatic, "exit");
      process.kill(-automatic.pid, "SIGTERM");
      await exited;
    }
  }
} finally {
  await stop();
  await rm(root, { recursive: true, force: true });
}
console.log(`Package verified: ${tarball}`);
