import {
  createServer,
  type Server,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { createEngine, queryArgs } from "./engine.ts";
import { ReportCache } from "./cache.ts";
import { ENGINE_VERSION, VERSION, type Query } from "../types.ts";

export interface ServerOptions {
  port?: number;
  publicDir?: string;
  env?: NodeJS.ProcessEnv;
  cacheTtl?: number;
}
export async function startServer(options: ServerOptions = {}) {
  const engine = createEngine(options.env);
  const cache = new ReportCache(options.cacheTtl);
  const publicDir =
    options.publicDir ?? fileURLToPath(new URL("./public", import.meta.url));
  let actualPort = options.port ?? 4317;
  const server = createServer((req, res) => {
    void handle(req, res).catch((error) => {
      if (!res.headersSent)
        json(res, 500, {
          error:
            error instanceof Error ? error.message : "Unable to read usage.",
        });
      else res.end();
    });
  });
  async function handle(req: IncomingMessage, res: ServerResponse) {
    const host = req.headers.host ?? "";
    const allowed = new Set([
      `127.0.0.1:${actualPort}`,
      `localhost:${actualPort}`,
    ]);
    if (!allowed.has(host))
      return json(res, 403, { error: "Only loopback hosts are allowed." });
    if (
      req.headers.origin &&
      !new Set([...allowed].map((h) => `http://${h}`)).has(req.headers.origin)
    )
      return json(res, 403, { error: "Cross-origin access is not allowed." });
    if (req.headers["sec-fetch-site"] === "cross-site")
      return json(res, 403, { error: "Cross-site access is not allowed." });
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.setHeader("Allow", "GET, HEAD");
      return json(res, 405, { error: "Method not allowed." });
    }
    const url = new URL(req.url ?? "/", `http://${host}`);
    if (url.pathname === "/api/health")
      return json(res, 200, {
        ok: true,
        version: VERSION,
        engine: ENGINE_VERSION,
      });
    if (url.pathname === "/api/info") {
      const env = options.env ?? process.env;
      return json(res, 200, {
        version: VERSION,
        engineVersion: ENGINE_VERSION,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        refreshSeconds: 30,
        offline: true,
        sources: [
          {
            agent: "claude",
            path:
              env.CLAUDE_CONFIG_DIR ??
              `${homedir()}/.claude, ${env.XDG_CONFIG_HOME ?? `${homedir()}/.config`}/claude`,
          },
          { agent: "codex", path: env.CODEX_HOME ?? `${homedir()}/.codex` },
          {
            agent: "opencode",
            path:
              env.OPENCODE_DATA_DIR ??
              `${env.XDG_DATA_HOME ?? `${homedir()}/.local/share`}/opencode`,
          },
        ],
        projectCoverage:
          "Claude Code project reports are read directly from ccusage. Other agents are grouped by project only when their upstream session report includes projectPath. Codex does not currently expose project paths.",
      });
    }
    const method = (
      {
        "/api/report": "report",
        "/api/blocks": "blocks",
        "/api/projects": "projects",
      } as const
    )[url.pathname as "/api/report"];
    if (method) {
      if (
        [...url.searchParams.keys()].some(
          (k) => !["since", "until", "timezone", "mode", "refresh"].includes(k),
        )
      )
        return json(res, 400, { error: "Unknown query parameter." });
      const query: Query = {};
      for (const key of ["since", "until", "timezone", "mode"] as const) {
        const v = url.searchParams.get(key);
        if (v) Object.assign(query, { [key]: v });
      }
      try {
        queryArgs(query);
      } catch (error) {
        return json(res, 400, { error: (error as Error).message });
      }
      const key = JSON.stringify([method, query]);
      const value = await cache.get(
        key,
        () => engine[method](query),
        url.searchParams.get("refresh") === "1",
      );
      return json(res, 200, value);
    }
    if (url.pathname.startsWith("/api/"))
      return json(res, 404, { error: "Unknown endpoint." });
    let pathname: string;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return json(res, 400, { error: "Invalid path." });
    }
    const path = resolve(
      publicDir,
      `.${pathname === "/" ? "/index.html" : pathname}`,
    );
    if (!path.startsWith(resolve(publicDir) + sep))
      return json(res, 403, { error: "Invalid path." });
    try {
      const data = await readFile(path);
      const mime: Record<string, string> = {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".woff2": "font/woff2",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".ico": "image/x-icon",
      };
      res.setHeader(
        "Content-Type",
        mime[extname(path)] ?? "application/octet-stream",
      );
      res.setHeader(
        "Cache-Control",
        pathname.startsWith("/assets/")
          ? "public, max-age=31536000, immutable"
          : "no-cache",
      );
      res.writeHead(200);
      res.end(req.method === "HEAD" ? undefined : data);
    } catch {
      json(res, 404, { error: "File not found." });
    }
  }
  for (let attempt = 0; ; attempt++) {
    try {
      await listen(server, actualPort);
      actualPort = (server.address() as { port: number }).port;
      break;
    } catch (error) {
      if (
        (error as NodeJS.ErrnoException).code !== "EADDRINUSE" ||
        attempt >= 20 ||
        actualPort >= 65535
      ) {
        engine.close();
        throw error;
      }
      actualPort++;
    }
  }
  return {
    server,
    port: actualPort,
    url: `http://127.0.0.1:${actualPort}`,
    close: async () => {
      engine.close();
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}
function json(res: ServerResponse, status: number, value: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(value));
}
function listen(server: Server, port: number) {
  return new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      server.off("listening", onListen);
      reject(error);
    };
    const onListen = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListen);
    server.listen(port, "127.0.0.1");
  });
}
