import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { Totals, UsageRow, Query } from "../types.ts";
import {
  agentName,
  usd,
  tokens,
  int,
  sum,
  groupPeriod,
  shiftDate,
  csv,
  download,
} from "./data.ts";
export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
export function RangeSwitch({
  value,
  onChange,
  items,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  items: [string, string][];
  label: string;
}) {
  return (
    <div className="range-switch" role="group" aria-label={label}>
      {items.map(([id, text]) => (
        <button
          key={id}
          aria-pressed={value === id}
          className={value === id ? "is-on" : ""}
          onClick={() => onChange(id)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
export function StatTile({
  label,
  value,
  hero,
  detail,
  delta,
}: {
  label: string;
  value: string;
  hero?: boolean;
  detail: ReactNode;
  delta?: number | null;
}) {
  return (
    <article className={`stat-tile ${hero ? "hero" : ""}`}>
      <span className="label">{label}</span>
      <div className={hero ? "figure-xl" : "figure"} title={value}>
        {value}
      </div>
      <div className="stat-foot">
        {delta !== undefined && delta !== null && (
          <span className={`delta ${delta > 0 ? "bad" : "good"}`}>
            {delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {detail}
      </div>
    </article>
  );
}
export function Dot({ color }: { color: string }) {
  return (
    <span className="dot" style={{ background: color }} aria-hidden="true" />
  );
}
export function TokenSplit({ totals }: { totals: Totals }) {
  const parts = [
    ["Input", totals.inputTokens, "--tok-input"],
    ["Output", totals.outputTokens, "--tok-output"],
    ["Cache write", totals.cacheCreationTokens, "--tok-cache-write"],
    ["Cache read", totals.cacheReadTokens, "--tok-cache-read"],
  ] as const;
  return (
    <div className="token-split">
      <div
        className="split-bar"
        role="img"
        aria-label={parts.map(([label, n]) => `${label}: ${int(n)}`).join(", ")}
      >
        {parts
          .filter(([, n]) => n > 0)
          .map(([label, n, color]) => (
            <span
              key={label}
              style={{ flex: n, background: `var(${color})` }}
            />
          ))}
      </div>
      <ul className="token-legend">
        {parts.map(([label, n, color]) => (
          <li key={label}>
            <Dot color={`var(${color})`} />
            <span>{label}</span>
            <span className="data" title={int(n)}>
              {tokens(n)}
            </span>
            <span className="data muted">
              {totals.totalTokens
                ? Math.round((n / totals.totalTokens) * 100)
                : 0}
              %
            </span>
          </li>
        ))}
      </ul>
      {totals.totalTokens > parts.reduce((s, [, n]) => s + n, 0) && (
        <p className="caption muted">
          {tokens(totals.totalTokens - parts.reduce((s, [, n]) => s + n, 0))}{" "}
          additional tokens reported by the source.
        </p>
      )}
    </div>
  );
}
export function UsageBars({
  rows,
  metric,
  group,
  colors,
  query,
}: {
  rows: UsageRow[];
  metric: "totalCost" | "totalTokens";
  group: string;
  colors: (agent: string) => string;
  query: Query;
}) {
  const [active, setActive] = useState<string | null>(null);
  const agents = useMemo(
    () =>
      [...new Set(rows.map((r) => r.agent))].sort(
        (a, b) =>
          sum(rows.filter((r) => r.agent === b)).totalCost -
          sum(rows.filter((r) => r.agent === a)).totalCost,
      ),
    [rows],
  );
  const visible = agents.slice(0, 6);
  const series = agents.length > 6 ? [...visible, "other"] : visible;
  const data = useMemo(() => {
    const map = new Map<string, Record<string, string | number>>();
    if (group === "daily" && query.since && query.until) {
      for (
        let d = query.since;
        d <= query.until && map.size < 3700;
        d = shiftDate(d, 1)
      )
        map.set(d, { period: d, total: 0 });
    }
    for (const r of rows) {
      const row = map.get(r.period) ?? { period: r.period, total: 0 };
      const key = visible.includes(r.agent) ? r.agent : "other";
      row[key] = Number(row[key] ?? 0) + r[metric];
      row.total = Number(row.total) + r[metric];
      map.set(r.period, row);
    }
    return [...map.values()].sort((a, b) =>
      String(a.period).localeCompare(String(b.period)),
    );
  }, [rows, metric, group, query.since, query.until, visible.join(",")]);
  const selected = data.find((d) => d.period === active) ?? data.at(-1);
  const format = metric === "totalCost" ? usd : tokens;
  const max = Math.max(...data.map((d) => Number(d.total)), 1);
  const axisMax = metric === "totalCost" ? Math.ceil(max) : max;
  return (
    <div className="usage-bars">
      <div className="chart-readout" aria-live="polite">
        <span className="label">
          {selected ? String(selected.period) : "No activity"}
        </span>
        <strong className="data">
          {format(Number(selected?.total ?? 0))}
          {metric === "totalTokens" ? " tokens" : ""}
        </strong>
        {series.map((agent) => (
          <span className="readout-item" key={agent}>
            <Dot color={colors(agent)} />
            {agent === "other" ? "Other" : agentName(agent)}{" "}
            <span className="data">
              {format(Number(selected?.[agent] ?? 0))}
            </span>
          </span>
        ))}
      </div>
      {!data.length ? (
        <Empty
          title="No usage in this range"
          detail="Choose a wider date range or check your local data folders in Settings."
        />
      ) : (
        <>
          <div
            className="chart"
            role="img"
            aria-label={`${group} ${metric === "totalCost" ? "spending" : "tokens"} by coding agent. Use the period selector for exact values.`}
          >
            <ResponsiveContainer width="100%" height={230}>
              <BarChart
                data={data}
                margin={{ top: 16, right: 8, bottom: 0, left: 0 }}
                barCategoryGap="28%"
                onMouseMove={(state) => {
                  if (state.activeLabel !== undefined)
                    setActive(String(state.activeLabel));
                }}
              >
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis
                  dataKey="period"
                  tickLine={false}
                  axisLine={{ stroke: "var(--line-strong)" }}
                  tick={{
                    fill: "var(--ink-muted)",
                    fontSize: 10,
                    fontFamily: "Geist Mono",
                  }}
                  minTickGap={40}
                  tickFormatter={(v) => String(v).slice(5)}
                />
                <YAxis
                  width={60}
                  ticks={[0, axisMax / 2, axisMax]}
                  domain={[0, axisMax]}
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    fill: "var(--ink-muted)",
                    fontSize: 10,
                    fontFamily: "Geist Mono",
                  }}
                  tickFormatter={(v) =>
                    metric === "totalCost" ? `$${tokens(v)}` : tokens(v)
                  }
                />
                <Tooltip
                  content={() => null}
                  cursor={{ fill: "var(--surface-raised)" }}
                />
                {series.map((agent) => (
                  <Bar
                    key={agent}
                    dataKey={agent}
                    stackId="usage"
                    fill={colors(agent)}
                    stroke="var(--surface)"
                    strokeWidth={1.5}
                    radius={[3, 3, 0, 0]}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <label className="period-inspector caption muted">
            Inspect period
            <select
              aria-label="Inspect chart period"
              value={selected ? String(selected.period) : ""}
              onChange={(e) => setActive(e.target.value)}
            >
              {data.map((d) => (
                <option key={String(d.period)} value={String(d.period)}>
                  {String(d.period)} · {format(Number(d.total))}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
    </div>
  );
}
export function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  );
}
export function UsageTable({
  rows,
  kind,
  onSelect,
  colors,
  limit = 20,
}: {
  rows: UsageRow[];
  kind: "model" | "session" | "period" | "project";
  onSelect?: (row: UsageRow) => void;
  colors: (agent: string) => string;
  limit?: number;
}) {
  const [sort, setSort] = useState<{
    key: keyof Totals | "period";
    desc: boolean;
  }>({ key: "totalCost", desc: true });
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [rows, sort]);
  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const x = a[sort.key];
        const y = b[sort.key];
        const result =
          typeof x === "number" && typeof y === "number"
            ? x - y
            : String(x).localeCompare(String(y));
        return sort.desc ? -result : result;
      }),
    [rows, sort],
  );
  const columns: [keyof Totals | "period", string][] = [
    [
      "period",
      kind === "model"
        ? "Model"
        : kind === "session"
          ? "Session"
          : kind === "project"
            ? "Project"
            : "Period",
    ],
    ["inputTokens", "Input"],
    ["outputTokens", "Output"],
    ["cacheCreationTokens", "Cache W"],
    ["cacheReadTokens", "Cache R"],
    ["totalTokens", "Tokens"],
    ["totalCost", "Cost"],
  ];
  const totals = sum(rows);
  const pages = Math.max(1, Math.ceil(rows.length / limit));
  const safePage = Math.min(page, pages - 1);
  function exportRows() {
    download(
      `tokenmaster-${kind}.csv`,
      csv(
        sorted.map((r) => ({
          [kind]: r.period,
          agent: r.agent,
          models: r.modelsUsed.join("; "),
          lastActivity: r.metadata?.lastActivity ?? "",
          ...Object.fromEntries(columns.slice(1).map(([key]) => [key, r[key]])),
        })),
      ),
    );
  }
  return (
    <div>
      <div className="table-toolbar">
        <span className="caption muted">
          {int(rows.length)}{" "}
          {kind === "session"
            ? "sessions"
            : kind === "model"
              ? "models"
              : kind === "project"
                ? "projects"
                : "periods"}
        </span>
        <button
          className="quiet small"
          disabled={!rows.length}
          onClick={exportRows}
        >
          Export CSV
        </button>
      </div>
      <div className="table-scroll">
        <table className="usage-table">
          <thead>
            <tr>
              {columns.map(([key, label]) => (
                <th
                  key={key}
                  className={key === "period" ? "" : "num"}
                  aria-sort={
                    sort.key === key
                      ? sort.desc
                        ? "descending"
                        : "ascending"
                      : "none"
                  }
                >
                  <button
                    onClick={() =>
                      setSort({
                        key,
                        desc: sort.key === key ? !sort.desc : key !== "period",
                      })
                    }
                  >
                    {label}
                    {sort.key === key ? (
                      <span aria-hidden="true"> {sort.desc ? "↓" : "↑"}</span>
                    ) : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted
              .slice(safePage * limit, (safePage + 1) * limit)
              .map((r, i) => (
                <tr key={`${r.agent}-${r.period}-${i}`}>
                  <td>
                    <div className="table-name">
                      {r.agent !== "all" && <Dot color={colors(r.agent)} />}
                      <div>
                        {onSelect ? (
                          <button
                            className="row-link"
                            onClick={() => onSelect(r)}
                            title={r.period}
                          >
                            {r.period}
                          </button>
                        ) : (
                          <span className="row-title" title={r.period}>
                            {r.period}
                          </span>
                        )}
                        {r.agent !== "all" && (
                          <small>
                            {agentName(r.agent)}
                            {kind === "session" && r.metadata?.lastActivity
                              ? ` · ${r.metadata.lastActivity.slice(0, 10)}`
                              : ""}
                          </small>
                        )}
                      </div>
                    </div>
                  </td>
                  {columns.slice(1).map(([key]) => (
                    <td key={key} className="num" title={String(r[key])}>
                      {key === "totalCost"
                        ? usd(r.totalCost)
                        : tokens(Number(r[key]))}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td>Total</td>
                {columns.slice(1).map(([key]) => (
                  <td
                    key={key}
                    className="num"
                    title={String(totals[key as keyof Totals])}
                  >
                    {key === "totalCost"
                      ? usd(totals.totalCost)
                      : tokens(Number(totals[key as keyof Totals]))}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
        {rows.length === 0 && (
          <Empty
            title="No matching records"
            detail="Try another date range, agent, model, or search."
          />
        )}
      </div>
      {pages > 1 && (
        <div className="pagination">
          <button
            className="quiet small"
            disabled={safePage === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span className="caption muted">
            Page {safePage + 1} of {pages}
          </span>
          <button
            className="quiet small"
            disabled={safePage >= pages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
export function ActivityHeatmap({
  rows,
  since,
  until,
  onDate,
}: {
  rows: UsageRow[];
  since?: string;
  until: string;
  onDate: (date: string) => void;
}) {
  const days = groupPeriod(rows);
  const map = new Map(days.map((r) => [r.period, r.totalTokens]));
  const max = Math.max(...map.values(), 1);
  const start =
    since && since > shiftDate(until, -90) ? since : shiftDate(until, -90);
  const count = Math.max(
    0,
    Math.min(
      91,
      Math.round((Date.parse(until) - Date.parse(start)) / 86400000) + 1,
    ),
  );
  const offset = new Date(`${start}T12:00Z`).getUTCDay();
  return (
    <>
      <div
        className="heatmap"
        aria-label={`Token activity for ${count} days in the selected range`}
      >
        {Array.from({ length: offset }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const date = shiftDate(start, i);
          const n = map.get(date) ?? 0;
          return (
            <button
              key={date}
              style={{
                background: n
                  ? `color-mix(in srgb, var(--meter) ${25 + (75 * n) / max}%, var(--surface))`
                  : "var(--surface-raised)",
              }}
              aria-label={`${date}: ${int(n)} tokens. Show day.`}
              title={`${date} · ${tokens(n)} tokens`}
              onClick={() => onDate(date)}
            />
          );
        })}
      </div>
      <div className="heatmap-foot caption muted">
        <span>{start}</span>
        <span>
          Less <span className="heat-key" /> More
        </span>
        <span>{until}</span>
      </div>
    </>
  );
}
export function DetailDialog({
  row,
  onClose,
  colors,
}: {
  row: UsageRow | null;
  onClose: () => void;
  colors: (agent: string) => string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (row) ref.current?.showModal();
    else ref.current?.close();
  }, [row]);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="dialog-head">
        <h2>Usage detail</h2>
        <button className="quiet" onClick={onClose} aria-label="Close detail">
          Close
        </button>
      </div>
      {row && (
        <>
          <p className="detail-id data">{row.period}</p>
          <p className="caption muted">
            {agentName(row.agent)}
            {row.metadata?.lastActivity
              ? ` · Last activity ${row.metadata.lastActivity}`
              : ""}
          </p>
          <div className="detail-stats">
            <strong className="figure">{usd(row.totalCost)}</strong>
            <span className="data">{tokens(row.totalTokens)} tokens</span>
          </div>
          <TokenSplit totals={row} />
          {row.metadata?.projectPath && (
            <p className="data detail-id">{row.metadata.projectPath}</p>
          )}
          {row.modelBreakdowns.length > 0 && (
            <div className="detail-models">
              <h3>Models in this record</h3>
              {row.modelBreakdowns.map((m) => (
                <div key={m.modelName}>
                  <span className="data">
                    {m.modelName}
                    {m.missingPricing ? " · Price unavailable" : ""}
                  </span>
                  <span className="data">{usd(m.cost)}</span>
                </div>
              ))}
            </div>
          )}
          <button
            className="quiet"
            onClick={() =>
              download(
                "tokenmaster-detail.json",
                JSON.stringify(row, null, 2),
                "application/json",
              )
            }
          >
            Export record JSON
          </button>
        </>
      )}
    </dialog>
  );
}
