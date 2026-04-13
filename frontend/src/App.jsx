import { useState, useEffect, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import HomePage from "./pages/HomePage";
import AnalysisView from "./pages/AnalysisView";
import StatisticsView from "./pages/StatisticsView";
import { api } from "./api/client";

const POLL_INTERVAL = 3000;

export default function App() {
  const [view, setView] = useState("analysis");
  const [boards, setBoards] = useState([]);
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const [selectedBoard, setSelectedBoard] = useState(null);

  const [routes, setRoutes] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [fitnessHistory, setFitnessHistory] = useState([]);
  const [algoName, setAlgoName] = useState(null);
  const [duration, setDuration] = useState(null);
  const [usageData, setUsageData] = useState(null);

  const [pollingRunId, setPollingRunId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  /** Run whose results are currently shown on the canvas (for metrics / modal). */
  const [resultRun, setResultRun] = useState(null);

  const loadBoards = useCallback(async () => {
    try {
      const data = await api.listBoards();
      setBoards(data);
    } catch {}
  }, []);

  useEffect(() => { loadBoards(); }, [loadBoards]);

  useEffect(() => {
    if (!selectedBoardId) { setSelectedBoard(null); return; }
    api.getBoard(selectedBoardId)
      .then(setSelectedBoard)
      .catch(() => setSelectedBoard(null));
  }, [selectedBoardId]);

  useEffect(() => {
    if (!pollingRunId) return;
    const iv = setInterval(async () => {
      try {
        const run = await api.getRun(pollingRunId);
        if (run.status === "completed" && run.result) {
          setRoutes(run.result.routes);
          setMetrics(run.result.metrics);
          setFitnessHistory(run.result.fitness_history);
          setAlgoName(run.algorithm);
          setDuration(run.duration_seconds);
          setResultRun(run);
          setPollingRunId(null);
          setRefreshKey((k) => k + 1);
        } else if (run.status === "failed") {
          setResultRun(run);
          setPollingRunId(null);
          setRefreshKey((k) => k + 1);
        }
      } catch { setPollingRunId(null); }
    }, POLL_INTERVAL);
    return () => clearInterval(iv);
  }, [pollingRunId]);

  const handleUploaded = (board) => {
    loadBoards();
    setSelectedBoardId(board.id);
    setRoutes(null);
    setMetrics(null);
    setFitnessHistory([]);
    setAlgoName(null);
    setDuration(null);
    setUsageData(null);
    setResultRun(null);
  };

  const handleRunStart = (run) => {
    setPollingRunId(run.id);
    setAlgoName(run.algorithm);
    setRoutes(null);
    setMetrics(null);
    setFitnessHistory([]);
    setDuration(null);
    setUsageData(null);
    setResultRun(run);
    setRefreshKey((k) => k + 1);
  };

  const handleSelectRun = (run) => {
    if (!run.result) return;
    setRoutes(run.result.routes);
    setMetrics(run.result.metrics);
    setFitnessHistory(run.result.fitness_history);
    setAlgoName(run.algorithm);
    setDuration(run.duration_seconds);
    setResultRun(run);
    setPollingRunId(null);

    setSelectedBoardId(run.board_id);
    if (!selectedBoard || selectedBoard.id !== run.board_id) {
      api.getBoard(run.board_id).then(setSelectedBoard).catch(() => {});
    }
  };

  const handleDeleteBoard = async (id) => {
    await api.deleteBoard(id);
    loadBoards();
    if (selectedBoardId === id) {
      setSelectedBoardId(null);
      setSelectedBoard(null);
      setRoutes(null);
      setMetrics(null);
      setFitnessHistory([]);
      setAlgoName(null);
      setDuration(null);
      setResultRun(null);
    }
  };

  const headerSubtitle =
    view === "home"
      ? "Overview"
      : view === "stats"
        ? "Compare runs"
        : "Interactive workspace";

  return (
    <div className="flex h-screen">
      <Sidebar active={view} onChange={setView} />

      <div className="ml-16 flex-1 flex flex-col min-w-0">
        <header className="h-12 border-b border-pcb-border flex items-center px-5 shrink-0 bg-pcb-surface/30 backdrop-blur-sm">
          <div>
            <h1 className="text-sm font-bold tracking-tight">
              PCB Routing Optimizer
            </h1>
            <p className="text-[10px] text-pcb-muted">{headerSubtitle}</p>
          </div>
          <div className="flex-1" />
          {view === "analysis" && algoName && (
            <span className="text-[10px] font-mono text-pcb-accent bg-pcb-accent/10 px-2.5 py-1 rounded-md border border-pcb-accent/20">
              {algoName.toUpperCase()}
              {pollingRunId && (
                <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-pcb-copper animate-pulse" />
              )}
            </span>
          )}
        </header>

        {view === "home" && <HomePage />}

        {view === "analysis" && (
          <AnalysisView
            boards={boards}
            selectedBoardId={selectedBoardId}
            setSelectedBoardId={setSelectedBoardId}
            selectedBoard={selectedBoard}
            routes={routes}
            metrics={metrics}
            fitnessHistory={fitnessHistory}
            algoName={algoName}
            usageData={usageData}
            duration={duration}
            refreshKey={refreshKey}
            onUploaded={handleUploaded}
            onRunStart={handleRunStart}
            onSelectRun={handleSelectRun}
            onDeleteBoard={handleDeleteBoard}
            resultRun={resultRun}
          />
        )}

        {view === "stats" && <StatisticsView />}
      </div>
    </div>
  );
}
