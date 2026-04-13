import { useEffect } from "react";
import { X } from "lucide-react";
import MetricsPanel from "./MetricsPanel";
import ConvergenceChart from "./ConvergenceChart";
import { ALGO_LABELS, parametersToDisplayRows } from "../config/algorithmPresets";

function formatVal(v) {
  if (v == null) return "—";
  if (typeof v === "number" && !Number.isInteger(v)) return String(v);
  if (typeof v === "number") return v.toLocaleString();
  return String(v);
}

export default function RunDetailModal({ open, onClose, run }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !run) return null;

  const metrics = run.result?.metrics;
  const history = run.result?.fitness_history;
  const paramRows = parametersToDisplayRows(run.algorithm, run.parameters);
  const title = ALGO_LABELS[run.algorithm] || run.algorithm;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg max-h-[min(90vh,720px)] overflow-y-auto rounded-2xl border border-pcb-border
          bg-pcb-bg shadow-2xl shadow-black/40"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-pcb-border bg-pcb-bg/95 backdrop-blur px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-pcb-muted uppercase tracking-wider">Run details</p>
            <h2 className="text-base font-bold text-pcb-text truncate">{title}</h2>
            <p className="text-[11px] text-pcb-muted mt-1 truncate">
              {run.board_name || "Board"}
              {run.id != null && String(run.id).length > 4 && (
                <>
                  {" "}
                  · <span className="font-mono">{String(run.id).slice(0, 8)}…</span>
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-9 h-9 rounded-xl border border-pcb-border flex items-center justify-center
              text-pcb-muted hover:text-pcb-text hover:bg-pcb-surface/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div className="flex flex-wrap gap-2 text-[10px]">
            <span className="px-2 py-1 rounded-md border border-pcb-border bg-pcb-surface/40 text-pcb-muted">
              Status: <span className="text-pcb-text font-medium">{run.status}</span>
            </span>
            {run.duration_seconds != null && (
              <span className="px-2 py-1 rounded-md border border-pcb-accent/30 bg-pcb-accent/10 text-pcb-accent font-mono">
                {run.duration_seconds.toFixed(2)}s
              </span>
            )}
          </div>

          {run.error_message && (
            <p className="text-xs text-pcb-danger bg-pcb-danger/10 border border-pcb-danger/25 rounded-lg px-3 py-2">
              {run.error_message}
            </p>
          )}

          <section>
            <h3 className="text-xs font-semibold text-pcb-muted uppercase tracking-wider mb-2">Parameters</h3>
            {paramRows.length === 0 ? (
              <p className="text-xs text-pcb-muted italic">No tunable parameters for this algorithm.</p>
            ) : (
              <dl className="rounded-xl border border-pcb-border bg-pcb-surface/30 divide-y divide-pcb-border/80">
                {paramRows.map(({ key, label, value }) => (
                  <div key={key} className="flex justify-between gap-4 px-3 py-2.5 text-xs">
                    <dt className="text-pcb-muted">{label}</dt>
                    <dd className="font-mono text-pcb-text text-right">{formatVal(value)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          <section>
            <MetricsPanel metrics={metrics} duration={run.duration_seconds} />
          </section>

          {history && history.length >= 2 && (
            <section>
              <ConvergenceChart history={history} algorithm={run.algorithm} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
