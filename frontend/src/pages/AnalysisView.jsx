import { useState, useCallback } from "react";
import FileUpload from "../components/FileUpload";
import AlgorithmConfig from "../components/AlgorithmConfig";
import PCBCanvas from "../components/PCBCanvas";
import ConvergenceChart from "../components/ConvergenceChart";
import RunHistory from "../components/RunHistory";
import ResultMetricsCard from "../components/ResultMetricsCard";
import RunDetailModal from "../components/RunDetailModal";
import { api } from "../api/client";

function Trash2Icon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

export default function AnalysisView({
  boards,
  selectedBoardId,
  setSelectedBoardId,
  selectedBoard,
  routes,
  metrics,
  fitnessHistory,
  algoName,
  usageData,
  duration,
  refreshKey,
  onUploaded,
  onRunStart,
  onSelectRun,
  onDeleteBoard,
  resultRun,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRun, setModalRun] = useState(null);

  const openRunModal = useCallback(async (run) => {
    if (!run) return;
    setModalOpen(true);
    if (!run.id) {
      setModalRun(run);
      return;
    }
    try {
      const fresh = await api.getRun(run.id);
      setModalRun(fresh);
    } catch {
      setModalRun(run);
    }
  }, []);

  const openCurrentResultModal = useCallback(async () => {
    if (resultRun?.id) {
      await openRunModal(resultRun);
      return;
    }
    if (metrics && selectedBoard) {
      setModalOpen(true);
      setModalRun({
        algorithm: algoName || "baseline",
        board_name: selectedBoard.name,
        board_id: selectedBoard.id,
        parameters: resultRun?.parameters || {},
        status: "completed",
        duration_seconds: duration,
        result: {
          metrics,
          fitness_history: fitnessHistory,
          routes: routes || {},
        },
      });
    }
  }, [resultRun, metrics, selectedBoard, algoName, duration, fitnessHistory, routes, openRunModal]);

  return (
    <div className="flex-1 flex min-h-0">
      <div className="w-80 border-r border-pcb-border flex flex-col bg-pcb-surface/20 overflow-y-auto">
        <div className="p-4 space-y-5">
          <div>
            <label className="text-xs font-semibold text-pcb-muted uppercase tracking-wider mb-2 block">
              Board
            </label>
            {boards.length > 0 ? (
              <div className="space-y-1.5">
                {boards.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBoardId(b.id)}
                    className={`group flex items-center justify-between p-2.5 rounded-lg border cursor-pointer
                      transition-all text-xs
                      ${selectedBoardId === b.id
                        ? "bg-pcb-accent/10 border-pcb-accent/30 text-pcb-accent"
                        : "bg-pcb-surface/40 border-pcb-border text-pcb-muted hover:text-pcb-text hover:border-pcb-muted/40"}`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{b.name}</p>
                      <p className="text-[10px] mt-0.5 opacity-60">
                        {b.grid_width}×{b.grid_height} · {b.nets_count} nets
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDeleteBoard(b.id); }}
                      title="Delete board"
                      className="w-6 h-6 rounded flex items-center justify-center
                        text-pcb-muted/50 hover:text-pcb-danger hover:bg-pcb-danger/10
                        opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2Icon className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-3">
              <FileUpload onUploaded={onUploaded} />
            </div>
          </div>

          <div className="h-px bg-pcb-border" />

          <AlgorithmConfig
            boardId={selectedBoardId}
            onRunStart={onRunStart}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <PCBCanvas
          board={selectedBoard}
          routes={routes}
          usageData={usageData}
        />
      </div>

      <div className="w-[22rem] border-l border-pcb-border flex flex-col bg-pcb-surface/20 overflow-y-auto shrink-0">
        <div className="p-4 space-y-5">
          <ResultMetricsCard
            boardTitle={selectedBoard?.name}
            algorithm={algoName}
            run={resultRun}
            metrics={metrics}
            duration={duration}
            onOpenDetails={openCurrentResultModal}
          />

          <ConvergenceChart history={fitnessHistory} algorithm={algoName || "—"} />

          <RunHistory
            onSelectRun={onSelectRun}
            onOpenRunDetails={openRunModal}
            refreshTrigger={refreshKey}
          />
        </div>
      </div>

      <RunDetailModal open={modalOpen} onClose={() => { setModalOpen(false); setModalRun(null); }} run={modalRun} />
    </div>
  );
}
