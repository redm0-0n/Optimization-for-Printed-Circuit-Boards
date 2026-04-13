import { useState, useCallback } from "react";
import AlgorithmConfig from "../components/AlgorithmConfig";
import PCBCanvas from "../components/PCBCanvas";
import ConvergenceChart from "../components/ConvergenceChart";
import RunHistory from "../components/RunHistory";
import ResultMetricsCard from "../components/ResultMetricsCard";
import RunDetailModal from "../components/RunDetailModal";
import { api } from "../api/client";
import BoardSelector from "../components/BoardSelector";

export default function AnalysisView({
  boards,
  selectedBoardId,
  onBoardChange,
  selectedBoard,
  routes,
  metrics,
  fitnessHistory,
  algoName,
  usageData,
  duration,
  refreshKey,
  onRunStart,
  onSelectRun,
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
            <BoardSelector 
              boards={boards} 
              selectedId={selectedBoardId} 
              onChange={onBoardChange} 
            />
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
            boardId={selectedBoardId}
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