# Verification record

Verified locally on Linux x64, Node 22.21.1, against ccusage 20.0.28.

## Automated

- TypeScript strict typecheck and production Vite/esbuild build pass.
- 15 TokenMaster tests pass: multi-agent API equality, duplicate/malformed Claude rows, exact known token/cost values, upstream block/project parity, appended-log refresh, empty histories, port conflicts, loopback binding, shutdown, invalid queries, cross-origin protection, CSV escaping, date boundaries, cached-input accounting, model drill-down aggregation, caching, and platform opener construction.
- Four actual adapters are exercised together: Claude, Codex, OpenCode, and Copilot. Copilot uses the existing upstream fixtures.
- 12 original upstream JavaScript launcher tests pass without modification.
- Original Rust workspace test command passed locally using installed Rust 1.99.0. The pinned Nix environment and Rust 1.97.1 were unavailable; no engine changes were made. Command: `cargo +1.99.0 test --manifest-path rust/Cargo.toml --workspace`.
- `npm run test:package` passed using a freshly created home and npm cache. It verifies the packed frontend/launcher, actual npx execution, version, no-argument browser opener, empty first run, automatic log discovery, daily/weekly/monthly/session/blocks, local HTTP responses, and process shutdown. No repository node_modules are used by the installed package.
- `.github/workflows/tokenmaster.yml` defines the same npm build/test/package flow on macOS, Linux, and Windows with Node 22 and 24. Execution status is recorded separately after CI runs.

## Browser review

The bundled production frontend was opened in the Codex in-app browser with real local Claude and Codex histories. No generated usage is shipped in the dashboard.

Verified: all six navigation views; source/model selection; daily/weekly/monthly chart groups and token/spend switch; keyboard period inspection; session search, sorting, paging, and dialog; project search and details; monthly period details; active-window filtering; budget save/edit/clear; light/dark theme; timezone save and cost modes; folder guidance; custom date control through native keyboard input; heatmap day selection; empty-agent display; automatic refresh. Settings used during testing were restored to dark theme, automatic costs, detected local timezone, and no budget.

Responsive inspection: 1440px desktop and 390px mobile. No document horizontal overflow; data tables and horizontal mobile navigation scroll within their own regions. Long session IDs ellipsize in the table and appear fully in the detail dialog. Production browser console had no errors or warnings.

Export buttons were activated. CSV serialization and raw precision are tested. The embedded browser did not emit download events, so completion of a browser-managed saved CSV/JSON file could not be confirmed in that surface. The browser-standard Blob download implementation is local and needs no server write permission.

## Fixes found during review

- Preserved the upstream launcher as a separate bundled module so its main-module guard cannot accidentally launch ccusage alongside TokenMaster.
- Preserved all models when grouping period and project detail records.
- Limited the heatmap to dates actually inside the selected range.
- Kept project reports consistent with agent/model selection.
- Formatted block timestamps in the selected reporting timezone.
- Prevented invalid/empty custom dates from producing misleading reports or invalid prior-period calculations.
- Reset scroll position on view navigation and prevented a previous query's comparison from being reused for a new query.

## Limits

No npm publication has occurred. npm scope ownership and final release authorization are still required. Project attribution is limited to fields the current upstream adapters expose. Windows GUI browser launching cannot be exercised on this Linux host; command construction is tested and Windows server/package tests are included in CI. The dashboard intentionally estimates API-equivalent usage, not paid subscription fees.
