import { useState, useEffect } from "react";
import { Trash2, Eye, Clock, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { api } from "../api/client";

const STATUS_ICON = {
  pending:  Clock,
  running:  Loader2,
  completed: CheckCircle2,
  failed:   AlertCircle,
};

const STATUS_CLASS = {
  pending:  "text-pcb-muted",
  running:  "text-pcb-copper animate-spin-slow",
  completed:"text-pcb-accent",
  failed:   "text-pcb-danger",
};

export default function RunHistory({ onSelectRun, refreshTrigger }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await api.listRuns();
      setRuns(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [refreshTrigger]);

  // Auto-poll while any run is running
  useEffect(() => {
    const hasRunning = runs.some((r) => r.status === "running" || r.status === "pending");
    if (!hasRunning) return;
    const iv = setInterval(load, 4000);
    return () => clearInterval(iv);
  }, [runs]);

  const handleDelete = async (id) => {
    try { await api.deleteRun(id); load(); } catch {}
  };

  const ALGO_BADGE = {
    baseline: "bg-pcb-info/15 text-pcb-info border-pcb-info/30",
    ga:       "bg-pcb-accent/15 text-pcb-accent border-pcb-accent/30",
    aco:      "bg-pcb-copper/15 text-pcb-copper border-pcb-copper/30",
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-pcb-muted uppercase tracking-wider">
        Run History
      </h3>

      {loading ? (
        <p className="text-xs text-pcb-muted text-center py-4">Loading…</p>
      ) : runs.length === 0 ? (
        <p className="text-xs text-pcb-muted italic text-center py-4">No runs yet</p>
      ) : (
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
          {runs.map((run) => {
            const StatusIcon = STATUS_ICON[run.status] || Clock;
            return (
              <div
                key={run.id}
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-pcb-surface/40 border border-pcb-border
                  hover:border-pcb-muted/40 transition-colors group fade-in-up"
              >
                <StatusIcon className={`w-4 h-4 shrink-0 ${STATUS_CLASS[run.status]}`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${ALGO_BADGE[run.algorithm] || ""}`}>
                      {run.algorithm.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-pcb-muted truncate">
                      {run.board_name || "—"}
                    </span>
                  </div>
                  <p className="text-[10px] text-pcb-muted mt-0.5 font-mono">
                    {run.duration_seconds != null
                      ? `${run.duration_seconds.toFixed(2)}s`
                      : run.status}
                  </p>
                </div>

                {run.status === "completed" && (
                  <button
                    onClick={() => onSelectRun(run)}
                    title="View results"
                    className="w-7 h-7 rounded-md flex items-center justify-center text-pcb-muted
                      hover:text-pcb-accent hover:bg-pcb-accent/10 opacity-0 group-hover:opacity-100
                      transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => handleDelete(run.id)}
                  title="Delete"
                  className="w-7 h-7 rounded-md flex items-center justify-center text-pcb-muted
                    hover:text-pcb-danger hover:bg-pcb-danger/10 opacity-0 group-hover:opacity-100
                    transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}