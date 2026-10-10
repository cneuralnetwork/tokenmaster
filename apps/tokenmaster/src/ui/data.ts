import type { Totals, UsageRow, ModelUsage, Query, Report } from "../types.ts";
export const names: Record<string, string> = {
  claude: "Claude Code",
  codex: "Codex",
  opencode: "OpenCode",
  amp: "Amp",
  droid: "Droid",
  codebuff: "Codebuff",
  hermes: "Hermes Agent",
  pi: "pi-agent",
  omp: "oh-my-pi",
  goose: "Goose",
  openclaw: "OpenClaw",
  kilo: "Kilo",
  kimi: "Kimi",
  qwen: "Qwen",
  copilot: "GitHub Copilot CLI",
  gemini: "Gemini CLI",
  antigravity: "Antigravity",
  grok: "Grok Build CLI",
  zcode: "ZCode",
};
export const agentName = (id: string) =>
  id === "all" ? "All tools" : (names[id] ?? id);
export const usd = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
export const int = (n: number) => new Intl.NumberFormat("en-US").format(n);
export const tokens = (n: number) => {
  for (const [limit, unit] of [
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "k"],
  ] as const)
    if (Math.abs(n) >= limit)
      return `${Number((n / limit).toPrecision(3))}${unit}`;
  return int(n);
};
export const zero = (): Totals => ({
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,
  totalTokens: 0,
  totalCost: 0,
});
export function sum(rows: Totals[]): Totals {
  return rows.reduce((a, r) => {
    for (const k of [
      "inputTokens",
      "outputTokens",
      "cacheCreationTokens",
      "cacheReadTokens",
      "totalTokens",
      "totalCost",
    ] as const)
      a[k] += r[k] ?? 0;
    return a;
  }, zero());
}
export function splitAgents(rows: UsageRow[]): UsageRow[] {
  return rows.flatMap(
    (row) => row.agents?.map((a) => ({ ...a, period: row.period })) ?? [row],
  );
}
export function modelTotals(m: ModelUsage): Totals {
  return {
    inputTokens: m.inputTokens,
    outputTokens: m.outputTokens,
    cacheCreationTokens: m.cacheCreationTokens,
    cacheReadTokens: m.cacheReadTokens,
    totalTokens:
      m.inputTokens +
      m.outputTokens +
      m.cacheCreationTokens +
      m.cacheReadTokens +
      (m.extraTotalTokens ?? 0),
    totalCost: m.cost,
  };
}
export function filterRows(
  rows: UsageRow[],
  agent: string,
  model: string,
): UsageRow[] {
  return splitAgents(rows)
    .filter((r) => agent === "all" || r.agent === agent)
    .flatMap((r) => {
      if (model === "all") return [r];
      const found = r.modelBreakdowns.filter((m) => m.modelName === model);
      if (!found.length) return [];
      return [
        {
          ...r,
          ...sum(found.map(modelTotals)),
          modelsUsed: [model],
          modelBreakdowns: found,
        },
      ];
    });
}
export function modelRows(rows: UsageRow[]): UsageRow[] {
  const map = new Map<string, UsageRow>();
  for (const row of rows)
    for (const m of row.modelBreakdowns) {
      const key = `${row.agent}\0${m.modelName}`;
      const prev = map.get(key);
      map.set(key, {
        agent: row.agent,
        period: m.modelName,
        ...sum([prev ?? zero(), modelTotals(m)]),
        modelsUsed: [m.modelName],
        modelBreakdowns: [],
      });
    }
  return [...map.values()];
}
export function groupPeriod(rows: UsageRow[]): UsageRow[] {
  const map = new Map<string, UsageRow>();
  for (const row of rows) {
    const prev = map.get(row.period);
    map.set(row.period, {
      ...row,
      ...sum([prev ?? zero(), row]),
      agent: "all",
      modelBreakdowns: mergeModels([
        ...(prev?.modelBreakdowns ?? []),
        ...row.modelBreakdowns,
      ]),
      modelsUsed: [
        ...new Set([...(prev?.modelsUsed ?? []), ...row.modelsUsed]),
      ],
    });
  }
  return [...map.values()].sort((a, b) => a.period.localeCompare(b.period));
}
export function mergeModels(models: ModelUsage[]): ModelUsage[] {
  const map = new Map<string, ModelUsage>();
  for (const model of models) {
    const previous = map.get(model.modelName);
    if (!previous) {
      map.set(model.modelName, { ...model });
      continue;
    }
    for (const key of [
      "inputTokens",
      "outputTokens",
      "cacheCreationTokens",
      "cacheReadTokens",
      "cost",
    ] as const)
      previous[key] += model[key];
    previous.extraTotalTokens =
      (previous.extraTotalTokens ?? 0) + (model.extraTotalTokens ?? 0);
    previous.missingPricing ||= model.missingPricing;
  }
  return [...map.values()];
}
export function dateInZone(zone: string, date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function rangeQuery(
  range: string,
  zone: string,
  start: string,
  end: string,
): Query {
  const today = dateInZone(zone);
  return {
    timezone: zone,
    ...(range === "all"
      ? {}
      : range === "custom"
        ? { since: start, until: end }
        : { since: shiftDate(today, 1 - Number(range)), until: today }),
  };
}
export function previousQuery(query: Query): Query | null {
  if (!query.since || !query.until || query.since > query.until) return null;
  const days =
    Math.round((Date.parse(query.until) - Date.parse(query.since)) / 86400000) +
    1;
  return {
    ...query,
    since: shiftDate(query.since, -days),
    until: shiftDate(query.since, -1),
  };
}
export function queryString(query: Query, refresh = false) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v) params.set(k, v);
  if (refresh) params.set("refresh", "1");
  return params.toString();
}
export function selectedTotals(report: Report, agent: string, model: string) {
  return agent === "all" && model === "all"
    ? report.totals
    : sum(filterRows(report.daily, agent, model));
}
export function csv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]!);
  const escape = (v: unknown) => {
    let s = Array.isArray(v) ? v.join("; ") : String(v ?? "");
    if (/^[=+@\-\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replaceAll('"', '""')}"`;
  };
  return [keys, ...rows.map((r) => keys.map((k) => r[k]))]
    .map((r) => r.map(escape).join(","))
    .join("\r\n");
}
export function download(name: string, body: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function readSetting<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`tokenmaster:${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function writeSetting(key: string, value: unknown) {
  try {
    localStorage.setItem(`tokenmaster:${key}`, JSON.stringify(value));
  } catch {
    /* Private browsing may disable storage. */
  }
}
