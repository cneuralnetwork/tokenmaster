import { build } from "esbuild";
import { build as viteBuild } from "vite";
import { chmod, copyFile, mkdir } from "node:fs/promises";
// Keep the original launcher in its own module: bundling it would make its
// isMainModule(import.meta.url) guard execute ccusage as well as TokenMaster.
await mkdir("dist/upstream", { recursive: true });
await copyFile("../ccusage/src/cli.js", "dist/upstream/cli.js");
await build({
  entryPoints: ["src/cli.ts"],
  outdir: "dist",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  banner: { js: "#!/usr/bin/env node" },
  plugins: [
    {
      name: "preserve-upstream-launcher",
      setup(b) {
        b.onResolve({ filter: /ccusage\/src\/cli\.js$/ }, () => ({
          path: "./upstream/cli.js",
          external: true,
        }));
      },
    },
  ],
  sourcemap: true,
});
await chmod("dist/cli.js", 0o755);
await viteBuild();
