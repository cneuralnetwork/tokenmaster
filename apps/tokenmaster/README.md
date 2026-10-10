![TokenMaster: ccusage, but beautiful.](https://raw.githubusercontent.com/cneuralnetwork/tokenmaster/tokenmaster-dashboard/apps/tokenmaster/assets/tokenmaster-banner.png)

# TokenMaster

A local-first analytics dashboard built on the actual [ccusage](https://github.com/ccusage/ccusage) engine. One process discovers your existing coding-agent logs, serves the bundled dashboard on localhost, and opens your browser. No account, API keys, database, or frontend setup.

**Release status:** prepared for npm publication, not yet published. The intended name is `@cneuralnetwork/tokenmaster`; confirm ownership of that npm scope before publishing. The unscoped `tokenmaster` name is already occupied.

After publication:

```bash
npx @cneuralnetwork/tokenmaster
```

Requires Node.js 22 or newer and npm. Supported native platforms: macOS, Linux (glibc), and Windows on x64 and arm64. npm installs the matching official ccusage prebuilt engine. Users do not need Rust or a compiler. The first npm download needs internet; the dashboard itself uses bundled offline pricing and local assets.

To run the release tarball before publication:

```bash
npx --yes --package ./cneuralnetwork-tokenmaster-0.1.0.tgz tokenmaster
```

## Commands

```bash
# Following a global install, or via npx @cneuralnetwork/tokenmaster <arguments>:
tokenmaster
tokenmaster --port 3000
tokenmaster --no-open
tokenmaster daily --offline
tokenmaster weekly --offline --json
tokenmaster monthly --offline --json
tokenmaster session --offline
tokenmaster blocks --offline
tokenmaster codex session --help
tokenmaster --claude-dir "/path/to/claude" --codex-dir "/path/to/codex"
```

No arguments launches the dashboard. Explicit report commands pass their arguments unchanged to ccusage, including agent commands, filters, cost modes, timezones, exports, and statusline options. `tokenmaster daily --help` shows the upstream report help; `tokenmaster --help` describes dashboard launch options. Explicit CLI reports retain upstream network behavior; use `--offline` to disable remote pricing refreshes.

The preferred dashboard port is 4317. If occupied, TokenMaster tries the next 20 ports and prints the actual URL. Ctrl+C stops the server and its engine processes. If automatic browser opening is unavailable, the printed URL still works. Close the terminal process when finished; closing a browser tab alone does not stop it.

## Dashboard

- Overview: exact engine spending and token totals, session counts, prior-period comparison, input/output/cache breakdown, monthly budget.
- Analytics: interactive stacked spending/token charts with keyboard-accessible period inspection; daily, weekly, monthly grouping; activity heatmap; tool and model breakdowns; cache share.
- Sessions: search, agent/model/date filters, sortable and paginated history, model details, raw record export.
- Usage blocks: original Claude five-hour windows, active-window costs, burn rate, projections, history filter, CSV export.
- Reports: sortable model/period/project tables, date ranges, filters, project search, drill-downs, CSV.
- Settings: light/dark themes, IANA timezone, upstream cost mode, detected source paths, and local folder override guidance.

The supplied Tokenmeter design artifact informs the exact palette, Geist typography, spacing, chart treatment, and layout; the product is named TokenMaster. Fonts ship locally. User preferences stay in browser localStorage. Budget limits are optional and do not change engine usage calculations.

### Accounting boundaries

ccusage is the source of truth. The API returns its JSON without replacing its parsers, deduplication, accounting, pricing, block detection, or date semantics. Input in unified reports means uncached input; cache reads are a separate category. Native report sections can differ in coverage: session reports follow each adapter's session attribution rules while daily reports aggregate daily events. TokenMaster preserves these differences.

Costs are API-equivalent estimates, not subscription invoices. Unknown model pricing is flagged. Dashboard pricing is the snapshot bundled with ccusage 20.0.28; an exact snapshot timestamp is not exposed. Upgrade the pinned engine packages to pick up pricing and adapter changes.

Project reports cover Claude project directories plus project paths exposed by other upstream session adapters. **The current upstream Codex JSON does not expose project attribution.** TokenMaster reports that limitation rather than guessing it from session IDs. Five-hour blocks apply to Claude Code. All other upstream capabilities remain accessible through the CLI.

### Local operation

The server binds only to `127.0.0.1`. It rejects foreign Host/Origin headers and cross-site requests, serves no CORS access, and uses a restrictive content security policy. It never uploads usage or prompts. The UI and fonts need no remote requests. No telemetry, accounts, external database, or hosted backend is included.

Reads are coalesced, serialized, and cached for 30 seconds in a bounded 12-entry in-memory cache. Visible pages refresh every 30 seconds, refresh on returning to the tab, and provide manual refresh. Background tabs stop polling. Large histories use the native engine; tables paginate, charts aggregate, and activity renders at most 91 days. A read times out after 120 seconds, with a clear error and the last successful data retained. No log files are modified.

## Development

This is a full Git fork of ccusage. The Rust engine, adapters, upstream CLI, tests, and license remain in their original locations. TokenMaster is isolated in `apps/tokenmaster` to simplify upstream merges. Use this directory's npm lockfile; the existing root pnpm/Nix workflow belongs to upstream.

From the repository root:

```bash
cd apps/tokenmaster
npm ci --workspaces=false
npm run build --workspaces=false
npm start -- --no-open
npm run typecheck --workspaces=false
npm test --workspaces=false
npm run test:upstream --workspaces=false
npm run test:package --workspaces=false
```

`test:package` uses a fresh npm cache and isolated home, runs the actual npx-installed tarball, checks production assets and empty-data startup, adds a synthetic log, runs every report command, checks shutdown, and verifies the browser opener on macOS/Linux. Windows opener command construction has a unit test; the package smoke test exercises the Windows server and report flow without launching a browser in CI.

To run the original engine tests, use upstream's Rust toolchain/environment:

```bash
cargo test --manifest-path rust/Cargo.toml --workspace
```

The engine executable is resolved with the **unchanged upstream npm launcher**, copied at build time to `dist/upstream/cli.js`. Keeping it a separate module preserves its original main-module guard. There is no substitute parser or pricing implementation. React, TypeScript, Tailwind, and Recharts compile into `dist/public`; the Node server is bundled into `dist/cli.js`.

## Publish preparation

```bash
npm run check --workspaces=false
npm run test:upstream --workspaces=false
npm run test:package --workspaces=false
npm pack --workspaces=false
# Only after verifying npm scope ownership and deciding to release:
npm publish --access public --workspaces=false
```

Publishing is a separate release action. No automated publish credentials or release execution are configured for TokenMaster. The distribution includes the executable, production frontend, upstream launcher, MIT license, font licenses, attribution, and third-party notices. Native engine packages are exact optional dependencies for the six supported platforms. Do not install with `--omit=optional`.

See `docs/VERIFICATION.md` and `docs/DESIGN_AUDIT.md` for verification and visual review notes. Upstream documentation is preserved at repository root and [ccusage.com](https://ccusage.com).

## License

MIT. ccusage copyright and attribution are preserved in `LICENSE` and `NOTICE.md`. Geist and Geist Mono use the SIL Open Font License. See `licenses/` for notices.
