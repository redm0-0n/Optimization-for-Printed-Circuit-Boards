import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, GitCompare, AlertCircle } from "lucide-react";
import { api } from "../api/client";
import RunDetailModal from "../components/RunDetailModal";
import { parametersToDisplayRows } from "../config/algorithmPresets";

const ALGO_FILTER = [
  { id: "all", label: "All algorithms" },
  { id: "baseline", label: "Baseline" },
  { id: "ga", label: "GA" },
  { id: "aco", label: "ACO" },
];

function formatTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function metricCell(m, key, fmt) {
  if (!m || m[key] == null) return "—";
  if (fmt === "pct") return `${(m[key] * 100).toFixed(1)}%`;
  if (fmt === "num") return Number(m[key]).toLocaleString(undefined, { maximumFractionDigits: 2 });
  return String(m[key]);
}

function ParamsColumn({ run }) {
  const rows = parametersToDisplayRows(run.algorithm, run.parameters);
  if (rows.length === 0) {
    return <span className="text-pcb-muted">—</span>;
  }
  return (
    <div className="space-y-0.5 text-[10px] leading-snug">
      {rows.map(({ key, label, value }) => (
        <div key={key} className="font-mono">
          <span className="text-pcb-muted">{label}:</span>{" "}
          <span className="text-pcb-text">{value == null ? "—" : String(value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function StatisticsView() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [compareError, setCompareError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRun, setModalRun] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listRuns();
      setRuns(data);
    } catch {
      setRuns([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (filter === "all") return runs;
    return runs.filter((r) => r.algorithm === filter);
  }, [runs, filter]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setCompareError(null);
  };

  const openRunModal = async (run) => {
    setModalOpen(true);
    try {
      const fresh = await api.getRun(run.id);
      setModalRun(fresh);
    } catch {
      setModalRun(run);
    }
  };

  const openCompareWindow = () => {
    const byId = new Map(runs.map((r) => [r.id, r]));
    const ordered = [];
    for (const id of selectedIds) {
      const r = byId.get(id);
      if (r?.status === "completed" && r.result?.metrics) ordered.push(String(r.id));
    }
    if (ordered.length < 2) {
      setCompareError("Select at least two completed runs with metrics, then press Compare.");
      return;
    }
    setCompareError(null);
    const url = new URL(window.location.href);
    url.searchParams.set("compare", ordered.join(","));
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-6 py-4 border-b border-pcb-border flex flex-wrap items-center gap-3 shrink-0 bg-pcb-surface/20">
        <div>
          <h2 className="text-sm font-bold tracking-tight">Run statistics</h2>
          <p className="text-[11px] text-pcb-muted mt-0.5">
            Full parameters for GA/ACO. Compare opens charts in a new window.
          </p>
        </div>
        <div className="flex-1" />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-xs bg-pcb-surface border border-pcb-border rounded-lg px-3 py-2 text-pcb-text"
        >
          {ALGO_FILTER.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border border-pcb-border
            text-pcb-muted hover:text-pcb-text hover:bg-pcb-border/30 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
        <button
          type="button"
          onClick={openCompareWindow}
          disabled={selectedIds.size < 2}
          className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border border-pcb-accent/40
            bg-pcb-accent/10 text-pcb-accent hover:bg-pcb-accent/20 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <GitCompare className="w-3.5 h-3.5" />
          Compare (new window)
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {compareError && (
          <div className="flex items-center gap-2 text-xs text-pcb-danger bg-pcb-danger/10 border border-pcb-danger/30 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {compareError}
          </div>
        )}

        {loading && runs.length === 0 ? (
          <p className="text-xs text-pcb-muted text-center py-12">Loading runs…</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-pcb-muted italic text-center py-12">No runs match this filter.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-pcb-border">
            <table className="w-full text-xs text-left">
              <thead className="bg-pcb-surface/50 text-pcb-muted uppercase tracking-wider">
                <tr>
                  <th className="p-3 w-10" />
                  <th className="p-3 font-semibold">When</th>
                  <th className="p-3 font-semibold">Board</th>
                  <th className="p-3 font-semibold">Algo</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Time</th>
                  <th className="p-3 font-semibold">Success</th>
                  <th className="p-3 font-semibold">Wire</th>
                  <th className="p-3 font-semibold min-w-[200px]">Parameters</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((run) => {
                  const m = run.result?.metrics;
                  const completed = run.status === "completed";
                  return (
                    <tr
                      key={run.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openRunModal(run)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openRunModal(run);
                        }
                      }}
                      className="border-t border-pcb-border/80 hover:bg-pcb-surface/40 transition-colors cursor-pointer"
                    >
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          disabled={!completed}
                          checked={selectedIds.has(run.id)}
                          onChange={() => toggleSelect(run.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-pcb-border"
                          title={completed ? "Include in Compare (new window)" : "Only completed runs"}
                        />
                      </td>
                      <td className="p-3 text-pcb-muted whitespace-nowrap">{formatTime(run.created_at)}</td>
                      <td className="p-3 max-w-[140px] truncate">{run.board_name || "—"}</td>
                      <td className="p-3 font-semibold">{run.algorithm.toUpperCase()}</td>
                      <td className="p-3 text-pcb-muted">{run.status}</td>
                      <td className="p-3 font-mono whitespace-nowrap">
                        {run.duration_seconds != null ? `${run.duration_seconds.toFixed(2)}s` : "—"}
                      </td>
                      <td className="p-3 font-mono">{metricCell(m, "success_rate", "pct")}</td>
                      <td className="p-3 font-mono">{metricCell(m, "total_wire_length", "num")}</td>
                      <td className="p-3 align-top text-pcb-text max-w-[280px]">
                        <ParamsColumn run={run} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[10px] text-pcb-muted text-center pb-4">
          Click a row for the full metrics window. Choose completed runs and press Compare to open charts in a new tab.
        </p>
      </div>

      <RunDetailModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setModalRun(null); }}
        run={modalRun}
      />
    </div>
  );
}
