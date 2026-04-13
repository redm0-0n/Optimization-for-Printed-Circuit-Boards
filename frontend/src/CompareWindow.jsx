import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { api } from "./api/client";
import CompareRunsCharts from "./components/CompareRunsCharts";

function metricCell(m, key, fmt) {
  if (!m || m[key] == null) return "—";
  if (fmt === "pct") return `${(m[key] * 100).toFixed(1)}%`;
  if (fmt === "num") return Number(m[key]).toLocaleString(undefined, { maximumFractionDigits: 2 });
  return String(m[key]);
}

function shortId(id) {
  const s = String(id);
  return s.length > 10 ? `${s.slice(0, 8)}…` : s;
}

/** One row per compared run (track), aligned numeric columns */
function RunsMetricsTable({ runs }) {
  if (!runs?.length) return null;

  return (
    <div className="rounded-xl border border-pcb-border bg-pcb-surface/30 p-4">
      <h2 className="text-xs font-semibold text-pcb-muted uppercase tracking-wider mb-1">
        Metrics by run
      </h2>
      <p className="text-[10px] text-pcb-muted mb-4">
        One row per selected track. Values come from each run&apos;s stored result.
      </p>
      <div className="overflow-x-auto rounded-lg border border-pcb-border/80">
        <table className="w-full text-xs border-collapse min-w-[720px]">
          <thead>
            <tr className="bg-pcb-surface/60 text-pcb-muted border-b border-pcb-border">
              <th className="py-2.5 px-3 text-left font-semibold whitespace-nowrap w-[1%]">Run ID</th>
              <th className="py-2.5 px-3 text-left font-semibold whitespace-nowrap">Algorithm</th>
              <th className="py-2.5 px-3 text-left font-semibold min-w-[120px]">Board</th>
              <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">Time (s)</th>
              <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">Wire length</th>
              <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">Success</th>
              <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">Overflow</th>
              <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">Congestion</th>
              <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">Routed nets</th>
            </tr>
          </thead>
          <tbody className="font-mono text-pcb-text tabular-nums">
            {runs.map((run) => {
              const m = run.result?.metrics;
              const nets =
                m?.routed_nets != null && m?.total_nets != null
                  ? `${m.routed_nets} / ${m.total_nets}`
                  : "—";
              return (
                <tr
                  key={run.id}
                  className="border-b border-pcb-border/60 last:border-0 hover:bg-pcb-surface/25 transition-colors"
                >
                  <td className="py-2.5 px-3 text-left align-middle" title={String(run.id)}>
                    <span className="text-pcb-accent">{shortId(run.id)}</span>
                  </td>
                  <td className="py-2.5 px-3 text-left align-middle font-sans font-semibold text-[11px]">
                    {(run.algorithm || "—").toUpperCase()}
                  </td>
                  <td className="py-2.5 px-3 text-left align-middle font-sans text-pcb-muted truncate max-w-[200px]" title={run.board_name || ""}>
                    {run.board_name || "—"}
                  </td>
                  <td className="py-2.5 px-3 text-right align-middle whitespace-nowrap">
                    {run.duration_seconds != null ? run.duration_seconds.toFixed(2) : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-right align-middle whitespace-nowrap">{metricCell(m, "total_wire_length", "num")}</td>
                  <td className="py-2.5 px-3 text-right align-middle whitespace-nowrap">{metricCell(m, "success_rate", "pct")}</td>
                  <td className="py-2.5 px-3 text-right align-middle whitespace-nowrap">{metricCell(m, "total_overflow", "num")}</td>
                  <td className="py-2.5 px-3 text-right align-middle whitespace-nowrap">{metricCell(m, "max_congestion", "num")}</td>
                  <td className="py-2.5 px-3 text-right align-middle whitespace-nowrap font-sans">{nets}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CompareWindow({ runIds }) {
  const [runs, setRuns] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!runIds?.length) {
      setError("No run IDs in the link.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const all = await api.listRuns();
        if (cancelled) return;
        const idOrder = runIds.map(String);
        const picked = idOrder
          .map((id) => all.find((r) => String(r.id) === id))
          .filter(Boolean);
        const completed = picked.filter((r) => r.status === "completed" && r.result?.metrics);
        setRuns(completed);
        if (!picked.length) {
          setError("No runs matched the IDs in this link.");
        } else if (completed.length < 2) {
          setError(`Need at least two completed runs with metrics (matched ${completed.length}).`);
        } else {
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load runs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [runIds]);

  return (
    <div className="min-h-screen bg-pcb-bg text-pcb-text">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-pcb-border bg-pcb-bg/95 backdrop-blur px-5 py-3">
        <h1 className="text-sm font-bold tracking-tight">Run comparison</h1>
        <span className="text-[10px] text-pcb-muted font-mono truncate max-w-[50vw]">
          {runIds.join(", ")}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => window.close()}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-pcb-border text-pcb-muted hover:text-pcb-text hover:bg-pcb-surface/50"
        >
          <X className="w-3.5 h-3.5" />
          Close window
        </button>
      </header>

      <main className="p-6 max-w-6xl mx-auto space-y-6">
        {loading && <p className="text-xs text-pcb-muted">Loading…</p>}
        {error && (
          <div className="text-xs text-pcb-danger bg-pcb-danger/10 border border-pcb-danger/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {!loading && runs.length >= 2 && (
          <>
            <CompareRunsCharts runs={runs} />
            <RunsMetricsTable runs={runs} />
          </>
        )}
      </main>
    </div>
  );
}
