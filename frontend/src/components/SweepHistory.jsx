import { useState, useEffect, useMemo } from "react";
import { Trash2, BarChart2, Clock, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { api } from "../api/client";

const STATUS_ICON = {
  pending: Clock,
  running: Loader2,
  completed: CheckCircle2,
  failed: AlertCircle,
};

const STATUS_CLASS = {
  pending: "text-pcb-muted",
  running: "text-pcb-copper animate-spin-slow",
  completed: "text-pcb-accent",
  failed: "text-pcb-danger",
};

export default function SweepHistory({ boardId, algorithm, onSelectSweep, refreshTrigger }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await api.listRuns();
      let filtered = data;
      if (boardId) filtered = filtered.filter(r => String(r.board_id) === String(boardId));
      if (algorithm) filtered = filtered.filter(r => r.algorithm === algorithm);
      setRuns(filtered);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [refreshTrigger, boardId, algorithm]);

  const sweepSessions = useMemo(() => {
    const groups = {};
    
    runs.forEach(run => {
      const sweepId = run.parameters?.sweep_id;
      if (!sweepId) return;

      if (!groups[sweepId]) {
        groups[sweepId] = {
          id: sweepId,
          created_at: run.created_at,
          target_field: run.parameters.sweep_target || "unknown",
          algorithm: run.algorithm,
          runs: [],
          status: "completed"
        };
      }
      
      groups[sweepId].runs.push(run);
      
      if (run.status === "running" || run.status === "pending") {
        groups[sweepId].status = "running";
      }
    });

    return Object.values(groups).sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
  }, [runs]);

  useEffect(() => {
    const hasRunning = sweepSessions.some(s => s.status === "running");
    if (!hasRunning) return;
    const iv = setInterval(load, 4000);
    return () => clearInterval(iv);
  }, [sweepSessions]);

  const handleDeleteSweep = async (sweepId) => {
    const session = sweepSessions.find(s => s.id === sweepId);
    if (!session) return;
    
    try {
      await Promise.all(session.runs.map(r => api.deleteRun(r.id)));
      load();
    } catch (e) {
      console.error("Failed to delete sweep session", e);
    }
  };

  if (!boardId) {
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-pcb-muted uppercase tracking-wider">Sweep History</h3>
        <p className="text-xs text-pcb-muted italic text-center py-4 border border-dashed border-pcb-border rounded-lg">Select a board</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-pcb-muted uppercase tracking-wider">
        Sweep History ({sweepSessions.length})
      </h3>

      {loading ? (
        <p className="text-xs text-pcb-muted text-center py-4">Loading…</p>
      ) : sweepSessions.length === 0 ? (
        <p className="text-xs text-pcb-muted italic text-center py-4 border border-dashed border-pcb-border rounded-lg">No sweep sessions yet</p>
      ) : (
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
          {sweepSessions.map((session) => {
            const StatusIcon = STATUS_ICON[session.status] || Clock;
            const runCount = session.runs.length;
            
            return (
              <div
                key={session.id}
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-pcb-surface/40 border border-pcb-border
                  hover:border-pcb-muted/40 transition-colors group fade-in-up"
              >
                <StatusIcon className={`w-4 h-4 shrink-0 ${STATUS_CLASS[session.status]}`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-pcb-accent uppercase">
                      Sweep: {session.target_field}
                    </span>
                  </div>
                  <p className="text-[10px] text-pcb-muted mt-0.5 font-mono">
                    {runCount} runs • {new Date(session.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>

                {session.status === "completed" && (
                  <button
                    type="button"
                    onClick={() => onSelectSweep(session)}
                    title="Load results into Explorer"
                    className="w-7 h-7 rounded-md flex items-center justify-center text-pcb-muted
                      hover:text-pcb-accent hover:bg-pcb-accent/10 opacity-0 group-hover:opacity-100
                      transition-all"
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => handleDeleteSweep(session.id)}
                  title="Delete entire session"
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