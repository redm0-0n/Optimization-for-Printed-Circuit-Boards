import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
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

function RunsMetricsTable({ runs }) {
  if (!runs?.length) return null;

  return (
    <div className="rounded-xl border border-pcb-border bg-pcb-surface/30 p-4">
      <div className="mb-4">
        <h2 className="text-xs font-semibold text-pcb-muted uppercase tracking-wider mb-1">
          Metrics Comparison Table
        </h2>
        <p className="text-[10px] text-pcb-muted">
          Detailed numeric breakdown for each selected routing run.
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-pcb-border/80">
        <table className="w-full text-xs border-collapse min-w-[800px]">
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

export default function CompareWindow({ runIds, onBack }) {
  const [runs, setRuns] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!runIds?.length) {
      setError("No run IDs selected for comparison.");
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

        const idSet = new Set(runIds.map(String));
        const picked = runIds
          .map(id => all.find(r => String(r.id) === String(id)))
          .filter(Boolean);

        const completed = picked.filter((r) => r.status === "completed" && r.result?.metrics);

        if (completed.length < 2) {
          setError(`Need at least two completed runs with metrics (found ${completed.length}).`);
        } else {
          setRuns(completed);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load runs for comparison.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [runIds]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-pcb-bg overflow-y-auto">
      <div className="p-6 max-w-6xl mx-auto w-full space-y-8">
        {/* Header Section */}
        <div className="flex items-center justify-between border-b border-pcb-border pb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border border-pcb-border 
                text-pcb-muted hover:text-pcb-text hover:bg-pcb-surface/50 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <h2 className="text-sm font-bold uppercase tracking-widest text-pcb-text">
              Run Comparison Analysis
            </h2>
          </div>
          <div className="text-[10px] text-pcb-muted font-mono">
            {runs.length} tracks compared
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-pcb-accent animate-spin" />
            <p className="text-xs text-pcb-muted">Loading metrics and history...</p>
          </div>
        ) : error ? (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-pcb-danger/10 border border-pcb-danger/20 text-pcb-danger text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <div>
              <p className="font-semibold mb-1">Comparison Error</p>
              <p>{error}</p>
              <button 
                onClick={onBack}
                className="mt-3 underline hover:no-underline"
              >
                Go back and select different runs
              </button>
            </div>
          </div>
        ) : (
          <>
            <CompareRunsCharts runs={runs} />

            <RunsMetricsTable runs={runs} />
          </>
        )}
      </div>
    </div>
  );
}