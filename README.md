# TokenMaster

A local-first AI coding-agent analytics dashboard built on [ccusage](https://github.com/ccusage/ccusage).

Implementation, usage, architecture, and release instructions: **[TokenMaster README](apps/tokenmaster/README.md)**.

Prepared npm package: `@cneuralnetwork/tokenmaster` (not yet published). After publication:

```bash
npx @cneuralnetwork/tokenmaster
```

No arguments opens the local dashboard. Explicit commands preserve the upstream CLI:

```bash
npx @cneuralnetwork/tokenmaster daily --offline
npx @cneuralnetwork/tokenmaster codex session --help
```

The full upstream Git history, Rust sources, adapters, tests, and MIT license are preserved. TokenMaster is isolated in `apps/tokenmaster`; all accounting runs through the official ccusage 20.0.28 engine.

See the [original ccusage README](apps/ccusage/README.md), [MIT license](LICENSE), and [attribution](apps/tokenmaster/NOTICE.md).
