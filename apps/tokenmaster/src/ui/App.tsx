import { useEffect, useMemo, useState } from "react";
import type { Envelope, Report, Query, UsageRow } from "../types.ts";
import { useApi } from "./hooks.ts";
import {
  Panel,
  RangeSwitch,
  StatTile,
  TokenSplit,
  UsageBars,
  UsageTable,
  ActivityHeatmap,
  Empty,
  Dot,
  DetailDialog,
} from "./components.tsx";
import {
  BlocksPage,
  Budget,
  ProjectsPage,
  SettingsPage,
  type Info,
} from "./pages.tsx";
import {
  agentName,
  names,
  usd,
  tokens,
  int,
  zero,
  sum,
  splitAgents,
  filterRows,
  modelRows,
  groupPeriod,
  dateInZone,
  shiftDate,
  rangeQuery,
  previousQuery,
  queryString,
  selectedTotals,
  readSetting,
  writeSetting,
} from "./data.ts";
const views = [
  "Overview",
  "Analytics",
  "Sessions",
  "Usage blocks",
  "Reports",
  "Settings",
] as const;
type View = (typeof views)[number];
export function App() {
  const [view, setView] = useState<View>("Overview");
  const [range, setRange] = useState("30");
  const [group, setGroup] = useState<"daily" | "weekly" | "monthly">("daily");
  const [agent, setAgent] = useState("all");
  const [model, setModel] = useState("all");
  const [search, setSearch] = useState("");
  const [metric, setMetric] = useState<"totalCost" | "totalTokens">(
    "totalCost",
  );
  const [reportKind, setReportKind] = useState("models");
  const [theme, setTheme] = useState(() => readSetting("theme", "dark"));
  const [zone, setZone] = useState(() =>
    readSetting("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone),
  );
  const [mode, setMode] = useState<"auto" | "calculate" | "display">(() =>
    readSetting("mode", "auto"),
  );
  const today = dateInZone(zone);
  const [start, setStart] = useState(shiftDate(today, -29));
  const [end, setEnd] = useState(today);
  const [refresh, setRefresh] = useState(0);
  const [budget, setBudget] = useState(() => readSetting("budget", 0));
  const [series, setSeries] = useState<string[]>(() =>
    readSetting("series", []),
  );
  const [detail, setDetail] = useState<UsageRow | null>(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    writeSetting("theme", theme);
  }, [theme]);
  useEffect(() => writeSetting("timezone", zone), [zone]);
  useEffect(() => writeSetting("mode", mode), [mode]);
  useEffect(() => writeSetting("budget", budget), [budget]);
  const query: Query = { ...rangeQuery(range, zone, start, end), mode };
  const queryKey = queryString(query);
  const rangeError =
    range === "custom" && (!start || !end || start > end)
      ? "Choose both dates, with the start on or before the end."
      : "";
  const previous = previousQuery(query);
  const report = useApi<Envelope<Report>>(
    rangeError ? null : `/api/report?${queryKey}`,
    refresh,
  );
  const prior = useApi<Envelope<Report>>(
    previous && !rangeError && view === "Overview"
      ? `/api/report?${queryString(previous)}`
      : null,
    refresh,
    false,
  );
  const month = useApi<Envelope<Report>>(
    `/api/report?${queryString({ timezone: zone, since: today.slice(0, 7) + "-01", until: today, mode })}`,
    refresh,
  );
  const info = useApi<Info>("/api/info", 0, false);
  const data = report.value?.data;
  const allAgents = useMemo(
    () => [
      ...new Set(
        [
          ...(data ? splitAgents(data.daily) : []),
          ...(month.value ? splitAgents(month.value.data.daily) : []),
        ].map((r) => r.agent),
      ),
    ],
    [data, month.value],
  );
  useEffect(() => {
    setSeries((current) => {
      const next = [
        ...current,
        ...allAgents.filter((a) => !current.includes(a)),
      ];
      if (next.length === current.length) return current;
      writeSetting("series", next);
      return next;
    });
  }, [allAgents.join(",")]);
  const colors = (id: string) =>
    id === "other" || series.indexOf(id) >= 6
      ? "var(--series-other)"
      : `var(--series-${(Math.max(0, series.indexOf(id)) % 6) + 1})`;
  const totals = data ? selectedTotals(data, agent, model) : zero();
  const daily = useMemo(
    () => (data ? filterRows(data.daily, agent, model) : []),
    [data, agent, model],
  );
  const chartRows = useMemo(
    () => (data ? filterRows(data[group], agent, model) : []),
    [data, agent, model, group],
  );
  const sessions = useMemo(
    () =>
      data
        ? filterRows(data.session, agent, model).filter((r) =>
            `${r.period} ${r.modelsUsed.join(" ")} ${r.metadata?.projectPath ?? ""}`
              .toLowerCase()
              .includes(search.toLowerCase()),
          )
        : [],
    [data, agent, model, search],
  );
  const models = useMemo(() => modelRows(daily), [daily]);
  const availableModels = useMemo(
    () => [...new Set(data?.daily.flatMap((d) => d.modelsUsed) ?? [])].sort(),
    [data],
  );
  const previousTotal =
    prior.value &&
    previous &&
    prior.loadedUrl === `/api/report?${queryString(previous)}`
      ? selectedTotals(prior.value.data, agent, model)
      : null;
  const delta =
    previousTotal && previousTotal.totalCost > 0
      ? ((totals.totalCost - previousTotal.totalCost) /
          previousTotal.totalCost) *
        100
      : null;
  const sessionCount = data ? filterRows(data.session, agent, model).length : 0;
  const monthTotals = month.value?.data.totals ?? zero();
  const monthAgents = month.value ? splitAgents(month.value.data.daily) : [];
  const label =
    range === "custom"
      ? `${start} to ${end}`
      : range === "all"
        ? "All time"
        : range === "1"
          ? "Today"
          : `${range}d`;
  const activeCount = new Set(daily.map((r) => r.agent)).size;
  const cacheShare = totals.totalTokens
    ? (totals.cacheReadTokens / totals.totalTokens) * 100
    : 0;
  const freshness = report.value ? new Date(report.value.readAt) : null;
  const inspectDate = (date: string) => {
    setStart(date);
    setEnd(date);
    setRange("custom");
    setView("Overview");
  };
  const loadFailed =
    !!report.error && report.loadedUrl !== `/api/report?${queryKey}`;
  function navigate(next: View) {
    setView(next);
    setSearch("");
    setDetail(null);
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to dashboard
      </a>
      <aside className="sidebar">
        <div className="brand">
          TokenMaster<span>Powered by ccusage</span>
        </div>
        <nav aria-label="Main navigation">
          {views.map((v) => (
            <button
              key={v}
              className={view === v ? "selected" : ""}
              aria-current={view === v ? "page" : undefined}
              onClick={() => navigate(v)}
            >
              {v}
            </button>
          ))}
        </nav>
        <div className="sources">
          <div className="source-heading">
            <span className="label">Sources</span>
            <span className="caption muted">This month</span>
          </div>
          <button
            className={`source-row ${agent === "all" ? "selected" : ""}`}
            onClick={() => {
              setAgent("all");
              setModel("all");
            }}
          >
            <span>All tools</span>
            <span className="data">
              {month.value ? usd(monthTotals.totalCost) : "Reading…"}
            </span>
          </button>
          {allAgents.map((id) => (
            <button
              className={`source-row ${agent === id ? "selected" : ""}`}
              key={id}
              onClick={() => {
                setAgent(id);
                setModel("all");
                if (view === "Settings") setView("Overview");
              }}
            >
              <span>
                <Dot color={colors(id)} />
                {agentName(id)}
              </span>
              <span className="data">
                {usd(sum(monthAgents.filter((r) => r.agent === id)).totalCost)}
              </span>
            </button>
          ))}
          {!allAgents.length && !report.loading && (
            <p className="caption muted">No sources detected in this range.</p>
          )}
        </div>
        <div className="sidebar-foot">
          <span className="local-mark">■ Local workspace</span>
          <p>Usage stays on this machine.</p>
          <button className="quiet small" onClick={() => navigate("Settings")}>
            Data & settings
          </button>
        </div>
      </aside>
      <main id="main">
        <header className="topbar">
          <div>
            <h1>{view}</h1>
            <span className="caption muted">
              {view === "Usage blocks"
                ? "Claude Code · Five-hour windows"
                : view === "Settings"
                  ? "Your local instrument"
                  : `${agent === "all" ? "All coding tools" : agentName(agent)} · ${label}`}
            </span>
          </div>
          <div className="topbar-actions">
            {view !== "Settings" && (
              <RangeSwitch
                label="Date range"
                value={range}
                onChange={setRange}
                items={[
                  ["1", "Today"],
                  ["7", "7d"],
                  ["30", "30d"],
                  ["all", "All"],
                  ["custom", "Custom"],
                ]}
              />
            )}
            <button
              className="primary"
              disabled={report.loading}
              onClick={() => setRefresh((n) => n + 1)}
            >
              {report.loading ? "Syncing…" : "Refresh"}
            </button>
          </div>
        </header>
        {view !== "Settings" && (
          <div className="filters">
            {range === "custom" && (
              <>
                <label>
                  From
                  <input
                    aria-label="Start date"
                    type="date"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </label>
                <label>
                  To
                  <input
                    aria-label="End date"
                    type="date"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </label>
              </>
            )}
            {view !== "Usage blocks" && (
              <>
                <label>
                  Agent
                  <select
                    aria-label="Filter agent"
                    value={agent}
                    onChange={(e) => {
                      setAgent(e.target.value);
                      setModel("all");
                    }}
                  >
                    <option value="all">All tools</option>
                    {[...new Set([...allAgents, ...Object.keys(names)])].map(
                      (id) => (
                        <option key={id} value={id}>
                          {agentName(id)}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  Model
                  <select
                    aria-label="Filter model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  >
                    <option value="all">All models</option>
                    {availableModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <span className="filter-note caption muted">
              {zone} · USD · Offline pricing
            </span>
          </div>
        )}
        {report.error && view !== "Settings" && (
          <div className="banner danger" role="alert">
            <strong>Could not refresh usage.</strong> {report.error}
            {!loadFailed && report.value
              ? " Showing the last successful read."
              : ""}
          </div>
        )}
        {freshness && Date.now() - freshness.getTime() > 3600000 && (
          <div className="banner warn">
            Usage has not been read in over an hour. Refresh to read the current
            logs.
          </div>
        )}
        {data?.totals.unpricedModels?.length ? (
          <div className="banner warn">
            Prices unavailable for {data.totals.unpricedModels.join(", ")}.
            Their tokens are included, but spending may be understated.
          </div>
        ) : null}
        {view === "Settings" ? (
          <SettingsPage
            info={info.value}
            theme={theme}
            setTheme={setTheme}
            zone={zone}
            setZone={setZone}
            mode={mode}
            setMode={(v) => setMode(v as typeof mode)}
          />
        ) : rangeError ? (
          <Panel title="Choose a date range">
            <p role="alert">{rangeError}</p>
          </Panel>
        ) : view === "Usage blocks" ? (
          <BlocksPage query={query} refresh={refresh} />
        ) : !data || loadFailed ? (
          <Panel
            title={
              report.loading ? "Reading local usage…" : "No report available"
            }
          >
            <Empty
              title={
                report.loading
                  ? "Connecting the numbers"
                  : "Check the data source"
              }
              detail={
                report.loading
                  ? "ccusage is discovering and processing your local agent logs. Large histories can take a moment on the first read."
                  : report.error || "Refresh to try reading the logs again."
              }
            />
          </Panel>
        ) : (
          <div
            className={report.loading ? "syncing" : ""}
            aria-busy={report.loading}
          >
            {(view === "Overview" || view === "Analytics") && (
              <>
                <div className="stats">
                  <StatTile
                    hero
                    label={`Spend · ${label}`}
                    value={usd(totals.totalCost)}
                    delta={view === "Overview" ? delta : undefined}
                    detail={
                      view === "Analytics" || range === "all"
                        ? "API-equivalent cost"
                        : delta !== null
                          ? "vs previous period"
                          : "No previous-period comparison"
                    }
                  />
                  <StatTile
                    label={`Tokens · ${label}`}
                    value={tokens(totals.totalTokens)}
                    detail={`${cacheShare.toFixed(1)}% cache reads`}
                  />
                  <StatTile
                    label="Sessions"
                    value={int(sessionCount)}
                    detail={`across ${activeCount} ${activeCount === 1 ? "tool" : "tools"}`}
                  />
                </div>
                <Panel
                  title={
                    metric === "totalCost"
                      ? "Spending over time"
                      : "Token usage over time"
                  }
                  action={
                    <div className="chart-controls">
                      <RangeSwitch
                        label="Chart metric"
                        value={metric}
                        onChange={(v) => setMetric(v as typeof metric)}
                        items={[
                          ["totalCost", "Spend"],
                          ["totalTokens", "Tokens"],
                        ]}
                      />
                      <RangeSwitch
                        label="Group by"
                        value={group}
                        onChange={(v) => setGroup(v as typeof group)}
                        items={[
                          ["daily", "Daily"],
                          ["weekly", "Weekly"],
                          ["monthly", "Monthly"],
                        ]}
                      />
                    </div>
                  }
                >
                  <UsageBars
                    rows={chartRows}
                    group={group}
                    metric={metric}
                    colors={colors}
                    query={query}
                  />
                </Panel>
                <div className="two-column">
                  <Panel title="Where the tokens go">
                    <TokenSplit totals={totals} />
                    <p className="caption muted token-note">
                      Cache reads represent {cacheShare.toFixed(1)}% of reported
                      tokens.
                    </p>
                  </Panel>
                  <Panel title="Spending in context">
                    <Budget
                      monthTotals={monthTotals}
                      budget={budget}
                      onBudget={setBudget}
                    />
                    {month.error && (
                      <p role="alert" className="caption danger-text">
                        Monthly budget data could not be refreshed:{" "}
                        {month.error}
                      </p>
                    )}
                    <p className="caption muted">
                      All tools · Calendar month · {zone}
                    </p>
                  </Panel>
                </div>
              </>
            )}
            {view === "Analytics" && (
              <>
                <Panel
                  title="Activity"
                  action={
                    <span className="caption muted">
                      Last 91 days in selected range · select a day
                    </span>
                  }
                >
                  <ActivityHeatmap
                    rows={daily}
                    since={query.since}
                    until={query.until ?? today}
                    onDate={inspectDate}
                  />
                </Panel>
                <div className="two-column">
                  <Panel title="Cost by tool">
                    {allAgents.map((id) => {
                      const n = sum(
                        daily.filter((r) => r.agent === id),
                      ).totalCost;
                      return (
                        <button
                          className="breakdown-row"
                          key={id}
                          onClick={() => {
                            setAgent(id);
                            setModel("all");
                          }}
                        >
                          <span>
                            <Dot color={colors(id)} />
                            {agentName(id)}
                          </span>
                          <span className="data">{usd(n)}</span>
                          <div className="breakdown-track">
                            <span
                              style={{
                                width: `${totals.totalCost ? (n / totals.totalCost) * 100 : 0}%`,
                                background: colors(id),
                              }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </Panel>
                  <Panel title="Cache efficiency">
                    <div className="figure">{cacheShare.toFixed(1)}%</div>
                    <p className="muted">
                      of all reported tokens were cache reads.
                    </p>
                    <dl className="facts">
                      <div>
                        <dt>Cache reads</dt>
                        <dd>{tokens(totals.cacheReadTokens)}</dd>
                      </div>
                      <div>
                        <dt>Cache writes</dt>
                        <dd>{tokens(totals.cacheCreationTokens)}</dd>
                      </div>
                      <div>
                        <dt>Fresh input</dt>
                        <dd>{tokens(totals.inputTokens)}</dd>
                      </div>
                      <div>
                        <dt>Output</dt>
                        <dd>{tokens(totals.outputTokens)}</dd>
                      </div>
                    </dl>
                  </Panel>
                </div>
              </>
            )}
            {(view === "Overview" || view === "Analytics") && (
              <Panel
                title="Model breakdown"
                action={
                  <span className="caption muted">
                    Raw precision preserved in exports
                  </span>
                }
              >
                <UsageTable
                  rows={models}
                  kind="model"
                  colors={colors}
                  onSelect={(r) => {
                    setModel(r.period);
                    setAgent(r.agent);
                    setView("Sessions");
                  }}
                />
              </Panel>
            )}
            {view === "Sessions" && (
              <>
                <div className="stats">
                  <StatTile
                    hero
                    label="Session spending"
                    value={usd(sum(sessions).totalCost)}
                    detail="Matching sessions in the selected range"
                  />
                  <StatTile
                    label="Sessions"
                    value={int(sessions.length)}
                    detail="Select a session to inspect its usage"
                  />
                  <StatTile
                    label="Session tokens"
                    value={tokens(sum(sessions).totalTokens)}
                    detail="Input, output, and cache tokens"
                  />
                </div>
                <Panel
                  title="Session history"
                  action={
                    <input
                      type="search"
                      aria-label="Search sessions"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search session, model, or project…"
                    />
                  }
                >
                  <UsageTable
                    rows={sessions}
                    kind="session"
                    colors={colors}
                    onSelect={setDetail}
                  />
                </Panel>
              </>
            )}
            {view === "Reports" && (
              <>
                <div className="report-navigation">
                  <RangeSwitch
                    label="Report type"
                    value={reportKind}
                    onChange={setReportKind}
                    items={[
                      ["models", "Models"],
                      ["periods", "Periods"],
                      ["projects", "Projects"],
                    ]}
                  />
                  {reportKind === "periods" && (
                    <RangeSwitch
                      label="Report period"
                      value={group}
                      onChange={(v) => setGroup(v as typeof group)}
                      items={[
                        ["daily", "Daily"],
                        ["weekly", "Weekly"],
                        ["monthly", "Monthly"],
                      ]}
                    />
                  )}
                </div>
                {reportKind === "projects" ? (
                  <ProjectsPage
                    agent={agent}
                    sessions={sessions}
                    query={query}
                    refresh={refresh}
                    model={model}
                    colors={colors}
                    onSelect={setDetail}
                  />
                ) : (
                  <Panel
                    title={
                      reportKind === "models"
                        ? "Detailed model report"
                        : `${group[0]!.toUpperCase() + group.slice(1)} usage report`
                    }
                  >
                    <UsageTable
                      rows={
                        reportKind === "models"
                          ? models
                          : groupPeriod(chartRows)
                      }
                      kind={reportKind === "models" ? "model" : "period"}
                      colors={colors}
                      onSelect={
                        reportKind === "models"
                          ? (r) => {
                              setModel(r.period);
                              setAgent(r.agent);
                              setView("Sessions");
                            }
                          : setDetail
                      }
                    />
                  </Panel>
                )}
              </>
            )}
            {data.daily.length === 0 && (
              <div className="banner">
                No local usage was found in this range. Run a supported coding
                agent, choose All, or check source folders in Settings.
              </div>
            )}
          </div>
        )}
        <footer className="report-footer">
          <span>
            {freshness
              ? `Read ${freshness.toLocaleTimeString()} · ${data?.session.length ?? 0} session records`
              : "Waiting for local logs"}
            {report.value
              ? ` · ${(report.value.durationMs / 1000).toFixed(2)}s`
              : ""}
          </span>
          <span>
            ccusage {info.value?.engineVersion ?? "20.0.28"} · Refreshes every
            30s while visible
          </span>
        </footer>
      </main>
      <DetailDialog
        row={detail}
        onClose={() => setDetail(null)}
        colors={colors}
      />
    </div>
  );
}
