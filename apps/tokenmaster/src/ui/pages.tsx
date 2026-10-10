import { useEffect, useMemo, useState } from "react";
import type {
  Envelope,
  BlockReport,
  ProjectReport,
  Query,
  UsageRow,
  Totals,
} from "../types.ts";
import {
  Panel,
  StatTile,
  Empty,
  UsageTable,
  TokenSplit,
  RangeSwitch,
} from "./components.tsx";
import { useApi } from "./hooks.ts";
import {
  usd,
  tokens,
  int,
  queryString,
  sum,
  zero,
  readSetting,
  writeSetting,
  modelTotals,
  mergeModels,
  csv,
  download,
  agentName,
} from "./data.ts";
export interface Info {
  version: string;
  engineVersion: string;
  timezone: string;
  refreshSeconds: number;
  offline: boolean;
  sources: { agent: string; path: string }[];
  projectCoverage: string;
}
export function BlocksPage({
  query,
  refresh,
}: {
  query: Query;
  refresh: number;
}) {
  const { value, loading, error } = useApi<Envelope<BlockReport>>(
    `/api/blocks?${queryString(query)}`,
    refresh,
  );
  const blocks = value?.data.blocks.filter((b) => !b.isGap) ?? [];
  const active = blocks.find((b) => b.isActive);
  const [history, setHistory] = useState("all");
  const shown = (
    history === "active" ? blocks.filter((b) => b.isActive) : blocks
  )
    .slice()
    .reverse();
  return (
    <div className={loading ? "syncing" : ""} aria-busy={loading}>
      {error && (
        <div className="banner danger" role="alert">
          {error}
        </div>
      )}
      <div className="stats">
        <StatTile
          hero
          label="Active window"
          value={active ? usd(active.costUSD) : "$0.00"}
          detail={
            active
              ? `Ends ${new Date(active.endTime).toLocaleTimeString(undefined, { timeZone: query.timezone })}`
              : "No active Claude Code billing window"
          }
        />
        <StatTile
          label="Burn rate"
          value={
            active?.burnRate
              ? `${usd(active.burnRate.costPerHour)}/h`
              : "Unavailable"
          }
          detail={
            active?.burnRate
              ? `${tokens(active.burnRate.tokensPerMinute)} tokens/min`
              : "Needs an active window with usage"
          }
        />
        <StatTile
          label="Projected window cost"
          value={
            active?.projection
              ? usd(active.projection.totalCost)
              : "Unavailable"
          }
          detail={
            active?.projection
              ? `${active.projection.remainingMinutes} minutes remaining`
              : "Projection comes directly from ccusage"
          }
        />
      </div>
      <Panel
        title="Claude Code billing windows"
        action={
          <RangeSwitch
            label="Block history"
            value={history}
            onChange={setHistory}
            items={[
              ["all", "All windows"],
              ["active", "Active only"],
            ]}
          />
        }
      >
        <p className="caption muted">
          Five-hour usage windows calculated by ccusage. Estimates describe
          token usage, not a provider invoice.
        </p>
        <div className="table-toolbar">
          <span className="caption muted">
            {int(shown.length)} windows {loading ? "· Syncing…" : ""}
          </span>
          <button
            className="quiet small"
            disabled={!shown.length}
            onClick={() =>
              download(
                "tokenmaster-blocks.csv",
                csv(
                  shown.map((b) => ({
                    start: b.startTime,
                    end: b.endTime,
                    active: b.isActive,
                    tokens: b.totalTokens,
                    cost: b.costUSD,
                    models: b.models,
                    projectedCost: b.projection?.totalCost ?? "",
                    costPerHour: b.burnRate?.costPerHour ?? "",
                  })),
                ),
              )
            }
          >
            Export CSV
          </button>
        </div>
        <div className="table-scroll">
          <table className="usage-table">
            <thead>
              <tr>
                <th>Start</th>
                <th>End</th>
                <th>Status</th>
                <th className="num">Tokens</th>
                <th className="num">Cost</th>
                <th>Models</th>
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, 200).map((b) => (
                <tr key={b.id}>
                  <td>
                    {new Date(b.startTime).toLocaleString(undefined, {
                      timeZone: query.timezone,
                    })}
                  </td>
                  <td>
                    {new Date(b.endTime).toLocaleString(undefined, {
                      timeZone: query.timezone,
                    })}
                  </td>
                  <td>
                    <span className={b.isActive ? "status ok" : "muted"}>
                      {b.isActive ? "Active" : "Closed"}
                    </span>
                  </td>
                  <td className="num">{tokens(b.totalTokens)}</td>
                  <td className="num">{usd(b.costUSD)}</td>
                  <td className="model-cell">{b.models.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {shown.length > 200 && (
          <p className="caption muted">
            Showing the latest 200 windows. Export includes all {shown.length}{" "}
            windows.
          </p>
        )}
        {!shown.length && (
          <Empty
            title={
              loading
                ? "Reading Claude Code windows…"
                : "No billing windows in this range"
            }
            detail="Claude Code logs are required for five-hour windows. Choose another range or check your Claude data folder in Settings."
          />
        )}
      </Panel>
    </div>
  );
}
export function ProjectsPage({
  agent,
  sessions,
  query,
  refresh,
  model,
  colors,
  onSelect,
}: {
  agent: string;
  sessions: UsageRow[];
  query: Query;
  refresh: number;
  model: string;
  colors: (id: string) => string;
  onSelect: (row: UsageRow) => void;
}) {
  const { value, loading, error } = useApi<Envelope<ProjectReport>>(
    `/api/projects?${queryString(query)}`,
    refresh,
  );
  const [search, setSearch] = useState("");
  const rows = useMemo(
    () =>
      Object.entries(value?.data.projects ?? {})
        .map(([project, days]) => {
          const selected =
            model === "all"
              ? days
              : days.flatMap((d) =>
                  d.modelBreakdowns
                    .filter((m) => m.modelName === model)
                    .map((m) => ({
                      ...d,
                      ...modelTotals(m),
                      modelsUsed: [model],
                      modelBreakdowns: [m],
                    })),
                );
          return {
            agent: "claude",
            period: project,
            ...sum(selected),
            modelsUsed: [...new Set(selected.flatMap((d) => d.modelsUsed))],
            modelBreakdowns: mergeModels(
              selected.flatMap((d) => d.modelBreakdowns),
            ),
          } satisfies UsageRow;
        })
        .concat(
          Object.values(
            sessions
              .filter((r) => r.agent !== "claude" && r.metadata?.projectPath)
              .reduce<Record<string, UsageRow[]>>((groups, r) => {
                const key = r.agent + "\0" + r.metadata!.projectPath;
                (groups[key] ??= []).push(r);
                return groups;
              }, {}),
          ).map((group) => ({
            agent: group[0]!.agent,
            period: group[0]!.metadata!.projectPath!,
            ...sum(group),
            modelsUsed: [...new Set(group.flatMap((r) => r.modelsUsed))],
            modelBreakdowns: mergeModels(
              group.flatMap((r) => r.modelBreakdowns),
            ),
          })),
        )
        .filter(
          (r) =>
            (agent === "all" || r.agent === agent) &&
            r.period.toLowerCase().includes(search.toLowerCase()) &&
            (model === "all" || r.modelsUsed.includes(model)),
        ),
    [value, model, search, agent, sessions],
  );
  return (
    <div className={loading ? "syncing" : ""}>
      {error && <div className="banner danger">{error}</div>}
      <Panel
        title="Project spending"
        action={
          <input
            type="search"
            aria-label="Search projects"
            placeholder="Find a project…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        }
      >
        <p className="caption muted">
          Claude Code projects and source-reported project paths. Codex's
          upstream report does not expose project attribution. Project directory
          IDs are preserved exactly.
        </p>
        <UsageTable
          rows={rows}
          kind="project"
          colors={colors}
          onSelect={onSelect}
        />
      </Panel>
    </div>
  );
}
export function Budget({
  monthTotals,
  budget,
  onBudget,
}: {
  monthTotals: Totals;
  budget: number;
  onBudget: (n: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(budget || ""));
  const [error, setError] = useState("");
  const share = budget ? monthTotals.totalCost / budget : 0;
  const status = share >= 1 ? "over" : share >= 0.8 ? "near" : "ok";
  return (
    <>
      <div className="budget-head">
        <span className="label">Monthly budget</span>
        {budget > 0 && (
          <span className={`status ${status}`}>
            {status === "over"
              ? "Over budget"
              : status === "near"
                ? "Near limit"
                : "On track"}
          </span>
        )}
      </div>
      {editing ? (
        <form
          className="budget-form"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(draft);
            if (!Number.isFinite(n) || n < 0) {
              setError("Enter a positive dollar amount or 0 to clear.");
              return;
            }
            onBudget(n);
            setEditing(false);
            setError("");
          }}
        >
          <label>
            Monthly limit (USD)
            <input
              aria-label="Monthly budget in USD"
              type="number"
              min="0"
              step="0.01"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
          </label>
          <button type="submit">Save budget</button>
          <button
            className="quiet"
            type="button"
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
          {error && <span role="alert">{error}</span>}
        </form>
      ) : budget > 0 ? (
        <>
          <div className="budget-value">
            <span className="figure">{usd(monthTotals.totalCost)}</span>
            <span className="data muted">
              {" "}
              / {usd(budget)} · {Math.round(share * 100)}%
            </span>
          </div>
          <div
            className={`budget-track ${status}`}
            role="meter"
            aria-label="Monthly budget used"
            aria-valuemin={0}
            aria-valuemax={budget}
            aria-valuenow={Math.min(monthTotals.totalCost, budget)}
          >
            <span style={{ width: `${Math.min(share * 100, 100)}%` }} />
          </div>
          <div className="budget-foot">
            <span className="caption muted">
              {share < 1
                ? `${usd(budget - monthTotals.totalCost)} remaining this month`
                : `${usd(monthTotals.totalCost - budget)} above your limit`}
            </span>
            <button
              className="quiet small"
              onClick={() => {
                setDraft(String(budget));
                setEditing(true);
              }}
            >
              Edit budget
            </button>
          </div>
        </>
      ) : (
        <div className="budget-empty">
          <p className="muted">
            Set a monthly limit to put your spending in context.
          </p>
          <button onClick={() => setEditing(true)}>Set a budget</button>
          <p className="caption muted">
            Saved in this browser. No account needed.
          </p>
        </div>
      )}
    </>
  );
}
export function SettingsPage({
  info,
  theme,
  setTheme,
  zone,
  setZone,
  mode,
  setMode,
}: {
  info: Info | null;
  theme: string;
  setTheme: (v: string) => void;
  zone: string;
  setZone: (v: string) => void;
  mode: string;
  setMode: (v: string) => void;
}) {
  const [draftZone, setDraftZone] = useState(zone);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  return (
    <>
      <Panel title="Appearance">
        <div className="setting-row">
          <div>
            <h3>Theme</h3>
            <p className="caption muted">
              The same instrument, tuned for your environment.
            </p>
          </div>
          <RangeSwitch
            value={theme}
            onChange={setTheme}
            label="Color theme"
            items={[
              ["dark", "Dark"],
              ["light", "Light"],
            ]}
          />
        </div>
      </Panel>
      <Panel title="Reporting">
        <form
          className="setting-row"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              new Intl.DateTimeFormat("en", { timeZone: draftZone }).format();
              setZone(draftZone);
              setError("");
              setSaved("Timezone saved. Reports now use " + draftZone);
            } catch {
              setError(
                "Enter a valid IANA timezone, such as Asia/Kolkata or UTC.",
              );
            }
          }}
        >
          <label>
            Timezone
            <p className="caption muted">
              Controls date boundaries in the upstream engine.
            </p>
            <input
              aria-label="Reporting timezone"
              list="timezones"
              value={draftZone}
              onChange={(e) => setDraftZone(e.target.value)}
            />
            <datalist id="timezones">
              {Intl.supportedValuesOf("timeZone").map((z) => (
                <option key={z} value={z} />
              ))}
            </datalist>
          </label>
          <button type="submit">Save timezone</button>
        </form>
        {error && (
          <p role="alert" className="danger-text">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="caption">
            {saved}
          </p>
        )}
        <div className="setting-row">
          <div>
            <h3>Cost mode</h3>
            <p className="caption muted">
              Auto uses recorded costs where available. Calculate uses bundled
              prices. Display uses recorded costs only.
            </p>
          </div>
          <select
            aria-label="Cost calculation mode"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="auto">Auto</option>
            <option value="calculate">Calculate</option>
            <option value="display">Display</option>
          </select>
        </div>
      </Panel>
      <Panel title="Local sources">
        <p className="caption muted">
          Detection and parsing belong to ccusage. All supported agent sources
          are included automatically.
        </p>
        {info?.sources.map((s) => (
          <div className="source-path" key={s.agent}>
            <strong>{agentName(s.agent)}</strong>
            <code>{s.path}</code>
          </div>
        ))}
        <details>
          <summary>Use a different log folder</summary>
          <p className="caption muted">
            Stop TokenMaster and launch with a folder override. Paths stay on
            your machine.
          </p>
          <code className="command">
            tokenmaster --claude-dir "/path/to/claude" --codex-dir
            "/path/to/codex"
          </code>
          <p className="caption muted">
            Other agents retain their upstream environment variables and
            configuration. Run tokenmaster &lt;agent&gt; --help for
            source-specific options.
          </p>
        </details>
      </Panel>
      <Panel title="About this report">
        <div className="setting-row">
          <div>
            <h3>TokenMaster {info?.version ?? "0.1.0"}</h3>
            <p className="caption muted">
              Built on ccusage {info?.engineVersion ?? "20.0.28"} · MIT licensed
            </p>
          </div>
          <a
            href="https://github.com/cneuralnetwork/tokenmaster"
            target="_blank"
            rel="noreferrer"
          >
            Source repository ↗
          </a>
        </div>
        <p className="caption muted">
          Prices are bundled with the engine release. The upstream package does
          not expose an exact snapshot timestamp. Unknown prices are flagged;
          subscription fees are not inferred. No telemetry, cloud backend, or
          runtime font requests.
        </p>
        <p className="caption muted">{info?.projectCoverage}</p>
      </Panel>
    </>
  );
}
