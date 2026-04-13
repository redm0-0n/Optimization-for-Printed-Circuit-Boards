import { PanelRight } from "lucide-react";
import MetricsPanel from "./MetricsPanel";

export default function ResultMetricsCard({
  boardTitle,
  algorithm,
  run,
  metrics,
  duration,
  onOpenDetails,
}) {
  const algo = (run?.algorithm || algorithm || "—").toString().toUpperCase();
  const board = run?.board_name || boardTitle || "—";
  const runHint = run?.id
    ? `Run ${String(run.id).slice(0, 8)}…`
    : "Run an optimization or pick a completed entry from history";

  return (
    <div className="rounded-xl border border-pcb-border bg-pcb-surface/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-xs font-semibold text-pcb-muted uppercase tracking-wider">
            Result metrics
          </h3>
          <p className="text-[10px] text-pcb-muted leading-snug mt-1">
            Values below apply to the same run as the routes on the canvas (board + algorithm).
          </p>
          <p className="text-[11px] text-pcb-text font-medium mt-2 truncate" title={board}>
            {board}
          </p>
          <p className="text-[10px] text-pcb-accent font-semibold mt-0.5">{algo}</p>
          <p className="text-[10px] text-pcb-muted font-mono mt-1">{runHint}</p>
        </div>
        <button
          type="button"
          disabled={!metrics}
          onClick={onOpenDetails}
          className="shrink-0 flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-2 rounded-lg border border-pcb-border
            text-pcb-muted hover:text-pcb-accent hover:border-pcb-accent/40 hover:bg-pcb-accent/5
            disabled:opacity-40 disabled:pointer-events-none transition-colors"
          title={metrics ? "Open full report" : "No metrics yet"}
        >
          <PanelRight className="w-3.5 h-3.5" />
          Full
        </button>
      </div>
      <MetricsPanel metrics={metrics} duration={duration} />
    </div>
  );
}
