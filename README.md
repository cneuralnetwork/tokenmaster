<p align="center">
  <img src="apps/tokenmaster/assets/tokenmaster-banner.png" alt="TokenMaster: ccusage, but beautiful. A sculpted stream of tokens on a dark green-black background." width="100%" />
</p>

<p align="center">
  <strong>Your tokens. Your machine. The full picture.</strong><br />
  A local-first dashboard for AI coding-agent usage and spending, powered by ccusage.
</p>

<p align="center">
  <a href="#get-started">Get started</a> ·
  <a href="#inside-the-dashboard">Dashboard</a> ·
  <a href="#ccusage-underneath">How it works</a> ·
  <a href="apps/tokenmaster/README.md">Documentation</a> ·
  <a href="https://github.com/cneuralnetwork/tokenmaster/actions/workflows/tokenmaster.yml">Build checks</a>
</p>

## Know where every token goes

AI coding tools leave a trail of usage logs. TokenMaster turns that trail into a clear view of your spending: which tools you use, which models cost the most, how much the cache saves in tokens, and what happened in each session.

It discovers existing logs, starts a small local server, and opens your browser. The dashboard, fonts, pricing snapshot, and reporting engine run locally. No accounts, API keys, telemetry, or hosted backend.

**A real fork of [ccusage](https://github.com/ccusage/ccusage).** Its parsers, token accounting, model pricing, report semantics, and five-hour window calculations remain the foundation. TokenMaster adds the visual layer and keeps the CLI within reach.

## Get started

**npm publication is pending.** The intended package is `@cneuralnetwork/tokenmaster`, because the unscoped `tokenmaster` name is occupied. Once published, the experience will be:

```bash
npx @cneuralnetwork/tokenmaster
```

Until then, run the application from this repository:

```bash
git clone --branch tokenmaster-dashboard https://github.com/cneuralnetwork/tokenmaster.git
cd tokenmaster/apps/tokenmaster
npm ci --workspaces=false
npm run build --workspaces=false
npm start
```

Requires **Node.js 22+** and npm. Supports macOS, Linux with glibc, and Windows, with official ccusage prebuilt packages for x64 and arm64. **No Rust installation or compilation is needed to run TokenMaster.** npm needs internet for the initial download; the dashboard works with local logs and bundled pricing afterward.

The browser opens automatically. The default address is `http://127.0.0.1:4317`; occupied ports are handled automatically. Press **Ctrl+C** in the terminal to stop the server.

<details>
<summary><strong>Prefer an npm-executable tarball?</strong></summary>

Build and pack once from `apps/tokenmaster`:

```bash
npm pack --workspaces=false
```

Then run that package from any directory, supplying its path:

```bash
npx --yes --package ./cneuralnetwork-tokenmaster-0.1.0.tgz tokenmaster
```

The tarball includes the production frontend and server. The matching native engine is installed automatically as an optional dependency. Keep npm optional dependencies enabled.

</details>

## Inside the dashboard

| View | What you can see and do |
| :--- | :--- |
| **Overview** | Spending, total tokens, session counts, period comparisons, and an optional monthly budget. |
| **Analytics** | Interactive spending and token charts, daily/weekly/monthly grouping, activity heatmap, tool costs, and cache efficiency. |
| **Sessions** | Searchable, sortable, paginated history with per-session costs, models, token breakdowns, and record exports. |
| **Usage blocks** | Claude Code five-hour windows, active usage, burn rate, projected cost, and historical windows. |
| **Reports** | Model, period, and project tables with filters, drill-downs, and CSV export. |
| **Settings** | Dark and light themes, reporting timezone, cost calculation mode, and local source configuration. |

Filter by agent, model, and date. Inspect exact values behind the charts. Read input, output, cache writes, and cache reads separately. Export raw precision when you need to work with the numbers elsewhere.

The dashboard refreshes every 30 seconds while visible and reads again when you return to the tab. **Refresh** picks up changes immediately. Existing results stay visible during a new read; empty histories show real zeros.

### Built for more than one coding tool

Claude Code, Codex, OpenCode, GitHub Copilot CLI, Gemini CLI, Amp, Droid, Codebuff, Hermes, pi, oh-my-pi, Goose, Kilo, Kimi, Qwen, OpenClaw, Antigravity, Grok, and ZCode are handled by the upstream engine. Source discovery and parsing stay with ccusage, including each tool's supported log formats and configuration.

## Your terminal still works

Running TokenMaster without arguments opens the dashboard. Explicit report commands are passed through to ccusage.

```bash
# In apps/tokenmaster after building:
node dist/cli.js --port 3000 --no-open
node dist/cli.js daily --offline
node dist/cli.js weekly --offline --json
node dist/cli.js monthly --offline
node dist/cli.js session --offline
node dist/cli.js blocks --offline
node dist/cli.js codex session --help
```

The installed executable is named `tokenmaster`. It preserves upstream agent commands and report flags. The dashboard always uses bundled offline pricing; explicit CLI reports retain upstream behavior, so use `--offline` when you want to prevent pricing refresh requests.

## ccusage underneath

```text
Local coding-agent logs
          │
          ▼
  Original ccusage engine
  parsing · accounting · pricing
          │
          ▼
  TokenMaster local server
  bounded cache · loopback API
          │
          ▼
  React dashboard in your browser
```

The full upstream Git history, Rust sources, adapters, tests, and MIT notices are preserved. TokenMaster lives in [`apps/tokenmaster`](apps/tokenmaster), with a small integration boundary that makes future upstream updates straightforward.

- **Original engine.** Official ccusage **20.0.28** native packages, resolved through its unchanged JavaScript launcher.
- **Self-contained frontend.** React, TypeScript, Tailwind CSS, Recharts, and locally bundled Geist fonts.
- **Local by default.** The HTTP server binds to `127.0.0.1`, rejects foreign origins and hosts, and never modifies the source logs.
- **Bounded work.** Concurrent reads are coalesced, engine jobs are serialized, and results use a short-lived, bounded in-memory cache. No database service is required.

### What the numbers mean

Costs are **API-equivalent estimates**, not subscription invoices. The dashboard uses the engine's bundled price snapshot and flags unknown model prices. Unified input-token totals exclude cache reads, which are shown separately.

Project reporting covers Claude project directories and project paths exposed by other upstream adapters. **Codex project attribution is not exposed by the current upstream JSON.** Five-hour usage blocks apply to Claude Code. Session and daily reports can differ in coverage because they preserve the adapters' own attribution rules.

## Tested as a package

The [cross-platform verification workflow](https://github.com/cneuralnetwork/tokenmaster/actions/workflows/tokenmaster.yml) passed all six combinations of **macOS, Linux, and Windows × Node.js 22 and 24**.

The checks cover a real npx installation in an isolated home and npm cache, production assets, automatic log discovery, empty histories, CLI reports, API parity, port conflicts, and shutdown. Browser-opener invocation is exercised on macOS/Linux; Windows opener construction is unit-tested.

The dashboard API is compared directly with ccusage JSON for Claude, Codex, OpenCode, and the upstream Copilot fixtures. Original launcher tests and the upstream Rust workspace suite are also retained.

See the [verification record](apps/tokenmaster/docs/VERIFICATION.md) for details and the remaining browser-download verification limitation.

<details>
<summary><strong>Run the checks locally</strong></summary>

From `apps/tokenmaster`:

```bash
npm run typecheck --workspaces=false
npm run build --workspaces=false
npm test --workspaces=false
npm run test:upstream --workspaces=false
npm run test:package --workspaces=false
```

Building the original engine tests is a separate contributor workflow that requires Rust. See the [development documentation](apps/tokenmaster/README.md#development).

</details>

## Contributing

Bug reports, source-adapter improvements, accessibility fixes, and thoughtful dashboard refinements are welcome. Include the operating system, Node version, agent, and reproduction steps. Use minimal synthetic fixtures when sharing logs, and remove private prompts and paths.

Keep engine behavior in the upstream engine and presentation work in `apps/tokenmaster`. Run the relevant tests and preserve the existing attribution. The [package documentation](apps/tokenmaster/README.md) covers architecture, packaging, and release preparation.

## Credits & license

TokenMaster builds on the work of the **[ccusage contributors](https://github.com/ccusage/ccusage)**. Read the [original ccusage README](apps/ccusage/README.md), [MIT license](LICENSE), and [attribution notice](apps/tokenmaster/NOTICE.md).

Geist and Geist Mono are distributed under the SIL Open Font License. Dependency and font notices are included in [`licenses`](apps/tokenmaster/licenses).
