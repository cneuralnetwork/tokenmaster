import { spawn, type ChildProcess } from "node:child_process";
import { createRequire } from "node:module";
import {
  resolveNativeBinary,
  ensureNativeBinaryExecutable,
  createNativeSpawner,
} from "../../../ccusage/src/cli.js";
import type { Query, Report, BlockReport, ProjectReport } from "../types.ts";

const require = createRequire(import.meta.url);
export function enginePath() {
  const binary = resolveNativeBinary({
    resolvePath: (id: string) => require.resolve(id),
  });
  if (!binary)
    throw new Error(
      `The ccusage engine is missing for ${process.platform}-${process.arch}. Reinstall with optional dependencies enabled (npm install --include=optional).`,
    );
  const error = ensureNativeBinaryExecutable({ binaryPath: binary });
  if (error) throw new Error(error.trim());
  return binary;
}
export function queryArgs(query: Query): string[] {
  const args = ["--offline", "--json", "--no-color"];
  for (const key of ["since", "until"] as const) {
    const value = query[key];
    if (value) {
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(Date.parse(value)) ||
        new Date(value).toISOString().slice(0, 10) !== value
      )
        throw new Error(
          `Invalid ${key}: use a real date in YYYY-MM-DD format.`,
        );
      args.push(`--${key}`, value);
    }
  }
  if (query.since && query.until && query.since > query.until)
    throw new Error("Start date must be on or before end date.");
  if (query.timezone) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: query.timezone }).format();
    } catch {
      throw new Error("Invalid IANA timezone.");
    }
    args.push("--timezone", query.timezone);
  }
  if (query.mode) {
    if (!["auto", "calculate", "display"].includes(query.mode))
      throw new Error("Invalid cost mode.");
    args.push("--mode", query.mode);
  }
  return args;
}
export function createEngine(env: NodeJS.ProcessEnv = process.env) {
  const children = new Set<ChildProcess>();
  let closed = false;
  const run = async <T>(args: string[]): Promise<T> => {
    if (closed) throw new Error("Engine is closed.");
    return new Promise((resolve, reject) => {
      const child = spawn(enginePath(), args, {
        env: { ...env, LOG_LEVEL: "0" },
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
      children.add(child);
      const chunks: Buffer[] = [];
      let size = 0;
      let stderr = "";
      let failure: Error | undefined;
      const timer = setTimeout(() => {
        failure = new Error(
          "Reading usage took longer than 120 seconds. Try a smaller date range.",
        );
        child.kill("SIGKILL");
      }, 120_000);
      child.stdout?.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > 128 * 1024 * 1024) {
          failure = new Error(
            "Report exceeded 128 MB. Try a smaller date range.",
          );
          child.kill("SIGKILL");
        } else chunks.push(chunk);
      });
      child.stderr?.on("data", (chunk: Buffer) => {
        stderr = (stderr + chunk.toString()).slice(-4000);
      });
      child.once("error", reject);
      child.once("close", (code) => {
        clearTimeout(timer);
        children.delete(child);
        if (failure) return reject(failure);
        if (code !== 0)
          return reject(
            new Error(stderr.trim() || `ccusage exited with code ${code}`),
          );
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()) as T);
        } catch {
          reject(new Error("ccusage returned an invalid JSON report."));
        }
      });
    });
  };
  return {
    report: (query: Query = {}) =>
      run<Report>([
        "daily",
        "--sections",
        "daily,weekly,monthly,session",
        "--by-agent",
        ...queryArgs(query),
      ]),
    blocks: (query: Query = {}) =>
      run<BlockReport>(["blocks", ...queryArgs(query)]),
    projects: (query: Query = {}) =>
      run<ProjectReport>([
        "claude",
        "daily",
        "--instances",
        ...queryArgs(query),
      ]),
    close: () => {
      closed = true;
      for (const child of children) child.kill("SIGKILL");
      children.clear();
    },
  };
}
export async function forwardCli(args: string[]) {
  // The fork's original launcher preserves terminal IO, exit codes and platform signals.
  const result = await createNativeSpawner()(enginePath(), args);
  if (result.error) throw result.error;
  if (result.signal) {
    process.kill(process.pid, result.signal);
    return 1;
  }
  return result.status ?? 1;
}
