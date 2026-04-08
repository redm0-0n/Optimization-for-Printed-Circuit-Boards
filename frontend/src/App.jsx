import { useState, useEffect, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import FileUpload from "./components/FileUpload";
import AlgorithmConfig from "./components/AlgorithmConfig";
import PCBCanvas from "./components/PCBCanvas";
import MetricsPanel from "./components/MetricsPanel";
import ConvergenceChart from "./components/ConvergenceChart";
import RunHistory from "./components/RunHistory";
import { api } from "./api/client";

const POLL_INTERVAL = 3000;

export default function App() {
  const [tab, setTab] = useState("optimize");
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

  // Load boards list
  const loadBoards = useCallback(async () => {
    try {
      const data = await api.listBoards();
      setBoards(data);
    } catch {}
  }, []);

  useEffect(() => { loadBoards(); }, [loadBoards]);

  // Load selected board details
  useEffect(() => {
    if (!selectedBoardId) { setSelectedBoard(null); return; }
    api.getBoard(selectedBoardId)
      .then(setSelectedBoard)
      .catch(() => setSelectedBoard(null));
  }, [selectedBoardId]);

  // Poll a running optimization
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
          setPollingRunId(null);
          setRefreshKey((k) => k + 1);
        } else if (run.status === "failed") {
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
    // Clear previous results
    setRoutes(null);
    setMetrics(null);
    setFitnessHistory([]);
    setAlgoName(null);
    setDuration(null);
    setUsageData(null);
  };

  const handleRunStart = (run) => {
    setPollingRunId(run.id);
    setAlgoName(run.algorithm);
    setRoutes(null);
    setMetrics(null);
    setFitnessHistory([]);
    setDuration(null);
    setUsageData(null);
    setRefreshKey((k) => k + 1);
  };

  const handleSelectRun = (run) => {
    if (!run.result) return;
    setRoutes(run.result.routes);
    setMetrics(run.result.metrics);
    setFitnessHistory(run.result.fitness_history);
    setAlgoName(run.algorithm);
    setDuration(run.duration_seconds);
    setPollingRunId(null);

    // Load the board for this run
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
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar active={tab} onChange={setTab} />

      <div className="ml-16 flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-12 border-b border-pcb-border flex items-center px-5 shrink-0 bg-pcb-surface/30 backdrop-blur-sm">
          <h1 className="text-sm font-bold tracking-tight">
            PCB Routing Optimizer
          </h1>
          <div className="flex-1" />
          {algoName && (
            <span className="text-[10px] font-mono text-pcb-accent bg-pcb-accent/10 px-2.5 py-1 rounded-md border border-pcb-accent/20">
              {algoName.toUpperCase()}
              {pollingRunId && (
                <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-pcb-copper animate-pulse" />
              )}
            </span>
          )}
        </header>

        {/* Main content */}
        <div className="flex-1 flex min-h-0">
          {/* Left panel */}
          <div className="w-80 border-r border-pcb-border flex flex-col bg-pcb-surface/20 overflow-y-auto">
            <div className="p-4 space-y-5">
              {/* Board selector */}
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
                        className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer
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
                          onClick={(e) => { e.stopPropagation(); handleDeleteBoard(b.id); }}
                          title="Delete board"
                          className="w-6 h-6 rounded flex items-center justify-center
                            text-pcb-muted/50 hover:text-pcb-danger hover:bg-pcb-danger/10
                            opacity-0 group-hover:opacity-100 transition-all
                            [&:hover]:opacity-100"
                        >
                          <Trash2Icon className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="mt-3">
                  <FileUpload onUploaded={handleUploaded} />
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-pcb-border" />

              {/* Algorithm config */}
              <AlgorithmConfig
                boardId={selectedBoardId}
                onRunStart={handleRunStart}
              />
            </div>

            {/* Metrics (bottom of left panel) */}
            <div className="mt-auto border-t border-pcb-border p-4">
              <MetricsPanel metrics={metrics} duration={duration} />
            </div>
          </div>

          {/* Center: Canvas */}
          <div className="flex-1 flex flex-col min-w-0">
            <PCBCanvas
              board={selectedBoard}
              routes={routes}
              usageData={usageData}
            />
          </div>

          {/* Right panel */}
          <div className="w-72 border-l border-pcb-border flex flex-col bg-pcb-surface/20 overflow-y-auto">
            <div className="p-4 space-y-5">
              <ConvergenceChart history={fitnessHistory} algorithm={algoName} />
              <RunHistory onSelectRun={handleSelectRun} refreshTrigger={refreshKey} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Tiny inline icon to avoid import in board list */
function Trash2Icon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}