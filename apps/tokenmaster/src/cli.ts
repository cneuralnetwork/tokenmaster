import { parseArgs } from "node:util";
import { startServer } from "./server/server.ts";
import { enginePath, forwardCli } from "./server/engine.ts";
import { openBrowser } from "./server/browser.ts";
import { VERSION, ENGINE_VERSION } from "./types.ts";
const args = process.argv.slice(2);
try {
  if (args[0] === "--version" || args[0] === "-v")
    console.log(`TokenMaster ${VERSION} · ccusage ${ENGINE_VERSION}`);
  else if (args[0] === "--help" || args[0] === "-h")
    console.log(
      `TokenMaster ${VERSION}\n\nUsage: tokenmaster [dashboard options]\n       tokenmaster <ccusage command> [upstream flags]\n\nNo arguments: start the local dashboard and open your browser.\n\nDashboard options:\n  --port <number>      Preferred port (default 4317; retries busy ports)\n  --no-open            Do not open a browser\n  --claude-dir <path>   Override Claude Code config folder\n  --codex-dir <path>    Override Codex home folder\n\nReports: daily, weekly, monthly, session, blocks, statusline\nAgents: claude, codex, opencode, amp, droid, codebuff, hermes, pi,\n        goose, kilo, copilot, gemini, antigravity, kimi, qwen,\n        openclaw, grok, zcode\n\nExamples:\n  tokenmaster --port 3000 --no-open\n  tokenmaster daily --offline --json\n  tokenmaster codex session --help\n\nDashboard uses bundled offline pricing. Explicit report commands retain\nall upstream options, including pricing refresh. Press Ctrl+C to stop.`,
    );
  else if (args[0] && !args[0].startsWith("--") && args[0] !== "dashboard")
    process.exitCode = await forwardCli(args);
  else {
    const dashboardArgs = args[0] === "dashboard" ? args.slice(1) : args;
    // Other upstream flag-only invocations retain the original daily CLI behavior.
    const dashboardFlags = [
      "--port",
      "--no-open",
      "--claude-dir",
      "--codex-dir",
    ];
    if (
      dashboardArgs.length &&
      !dashboardFlags.some((flag) =>
        dashboardArgs.some((a) => a === flag || a.startsWith(`${flag}=`)),
      )
    ) {
      process.exitCode = await forwardCli(dashboardArgs);
    } else {
      const { values } = parseArgs({
        args: dashboardArgs,
        options: {
          port: { type: "string" },
          "no-open": { type: "boolean" },
          "claude-dir": { type: "string" },
          "codex-dir": { type: "string" },
        },
      });
      const port = values.port === undefined ? 4317 : Number(values.port);
      if (!Number.isInteger(port) || port < 1 || port > 65535)
        throw new Error("--port must be an integer from 1 to 65535.");
      const env = { ...process.env };
      if (values["claude-dir"]) env.CLAUDE_CONFIG_DIR = values["claude-dir"];
      if (values["codex-dir"]) env.CODEX_HOME = values["codex-dir"];
      enginePath();
      const app = await startServer({ port, env });
      console.log(
        `tokenmaster ready → ${app.url}\nccusage ${ENGINE_VERSION} · local data · offline pricing\nPress Ctrl+C to stop.`,
      );
      let stopping = false;
      const stop = async () => {
        if (stopping) return;
        stopping = true;
        await app.close();
      };
      for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const)
        process.on(signal, () => {
          void stop();
        });
      if (!values["no-open"])
        try {
          await openBrowser(app.url);
        } catch {
          console.warn(
            `Could not open a browser automatically. Open ${app.url} manually.`,
          );
        }
    }
  }
} catch (error) {
  console.error(
    `tokenmaster: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
