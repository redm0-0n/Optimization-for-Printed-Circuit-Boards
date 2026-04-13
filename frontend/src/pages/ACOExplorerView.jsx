import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bug, Play, Square, RefreshCw, ChevronsRight, SlidersHorizontal } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import FileUpload from "../components/FileUpload";
import { api } from "../api/client";

const SWEEP_FIELDS = {
  alpha: { label: "Alpha (Pheromone)", min: 0, max: 5, step: 0.1, defaultStep: 0.5 },
  beta: { label: "Beta (Heuristic)", min: 0, max: 5, step: 0.1, defaultStep: 0.5 },
  evaporation_rate: { label: "Evaporation Rate", min: 0.01, max: 0.99, step: 0.01, defaultStep: 0.1 },
};

const ACO_MODES = {
  balanced: { label: "Balanced", alpha: 1.0, beta: 2.0, evaporation_rate: 0.1 },
  exploration: { label: "Heuristic Focus", alpha: 0.5, beta: 3.0, evaporation_rate: 0.2 },
  exploitation: { label: "Pheromone Focus", alpha: 2.0, beta: 1.0, evaporation_rate: 0.05 },
};

const SERIES_COLORS = ["#d29922", "#3fb950", "#58a6ff", "#f85149", "#a371f7", "#79c0ff", "#00d49a", "#ff8c42"];
const POLL_DELAY_MS = 2500;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function ACOExplorerView() {
  const [boards, setBoards] = useState([]);
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const [activeTab, setActiveTab] = useState("modes");

  const [ants, setAnts] = useState(50);
  const [iterations, setIterations] = useState(100);

  const [fixedAlpha, setFixedAlpha] = useState(1.0);
  const [fixedBeta, setFixedBeta] = useState(2.0);
  const [fixedEvap, setFixedEvap] = useState(0.1);

  const [sweepField, setSweepField] = useState("alpha");
  const [sweepMin, setSweepMin] = useState(0.5);
  const [sweepMax, setSweepMax] = useState(2.5);
  const [sweepStep, setSweepStep] = useState(0.5);

  const [runs, setRuns] = useState([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const stopRef = useRef(false);

  const loadBoards = useCallback(async () => {
    try {
      const data = await api.listBoards();
      setBoards(data);
      if (!selectedBoardId && data.length) setSelectedBoardId(data[0].id);
    } catch {}
  }, [selectedBoardId]);

  useEffect(() => { loadBoards(); }, [loadBoards]);

  const chartSeries = useMemo(() => runs.filter((r) => r.status === "completed" && r.history.length > 0), [runs]);
  const chartData = useMemo(() => {
    if (!chartSeries.length) return [];
    const maxLen = Math.max(...chartSeries.map((s) => s.history.length));
    const rows = [];
    for (let i = 0; i < maxLen; i++) {
      const row = { iter: i + 1 };
      chartSeries.forEach((s) => { if (i < s.history.length) row[s.key] = s.history[i]; });
      rows.push(row);
    }
    return rows;
  }, [chartSeries]);

  const executeRuns = async (runConfigs) => {
    setError(null); setRuns([]); setRunning(true); stopRef.current = false;
    for (const config of runConfigs) {
      if (stopRef.current) break;
      setRuns((prev) => [...prev, { key: config.key, label: config.label, runId: null, status: "starting", history: [], duration: null, metrics: null, error: null }]);
      try {
        const params = { num_ants: Number(ants), iterations: Number(iterations), alpha: config.alpha, beta: config.beta, evaporation_rate: config.evaporation_rate };
        const run = await api.startRun(selectedBoardId, "aco", params);
        setRuns((prev) => prev.map((r) => (r.key === config.key ? { ...r, runId: run.id, status: "running" } : r)));
        let finalRun = null;
        while (!stopRef.current) {
          finalRun = await api.getRun(run.id);
          if (finalRun.status === "completed" || finalRun.status === "failed") break;
          await sleep(POLL_DELAY_MS);
        }
        if (!finalRun) break;
        const completed = finalRun.status === "completed";
        setRuns((prev) => prev.map((r) => r.key !== config.key ? r : { 
          ...r, status: completed ? "completed" : "failed", 
          history: completed ? (finalRun.result.fitness_history || []) : [], 
          duration: finalRun.duration_seconds ?? null, 
          metrics: completed ? finalRun.result.metrics : null, 
          error: finalRun.error_message || null 
        }));
      } catch (e) {
        setRuns((prev) => prev.map((r) => r.key === config.key ? { ...r, status: "failed", error: e.message } : r));
      }
    }
    setRunning(false);
  };

  const startModeComparison = () => {
    if (!selectedBoardId || running) return;
    executeRuns(Object.entries(ACO_MODES).map(([key, mode]) => ({ key, label: mode.label, alpha: mode.alpha, beta: mode.beta, evaporation_rate: mode.evaporation_rate })));
  };

  const startSweep = () => {
    if (!selectedBoardId || running) return;
    const min = Number(sweepMin), max = Number(sweepMax), step = Number(sweepStep);
    if (min >= max || step <= 0) { setError("Range invalid: ensure End > Start and Step > 0."); return; }
    const vals = []; for (let v = min; v <= max + 0.0001; v += step) vals.push(Number(v.toFixed(4)));
    executeRuns(vals.map(val => ({
      key: `${sweepField}_${val}`, label: `${sweepField}=${val}`,
      alpha: sweepField === "alpha" ? val : Number(fixedAlpha),
      beta: sweepField === "beta" ? val : Number(fixedBeta),
      evaporation_rate: sweepField === "evaporation_rate" ? val : Number(fixedEvap),
    })));
  };

  return (
    <div className="flex-1 flex min-h-0">
      <div className="w-96 border-r border-pcb-border bg-pcb-surface/20 overflow-y-auto flex flex-col p-4 space-y-5">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-pcb-copper" />
          <h2 className="text-sm font-semibold">ACO Explorer</h2>
        </div>
        <p className="text-xs text-pcb-muted leading-relaxed">
          Investigate algorithm behavior: compare pre-defined strategies or perform precise parameter sweeps.
        </p>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-pcb-muted uppercase tracking-wider">Board</label>
            <button onClick={loadBoards} className="text-[10px] px-2 py-1 rounded border border-pcb-border text-pcb-muted hover:text-pcb-text transition-colors"><RefreshCw className="w-3 h-3 inline mr-1" />Refresh</button>
          </div>
          <select value={selectedBoardId || ""} onChange={(e) => setSelectedBoardId(e.target.value)} className="w-full rounded-lg border border-pcb-border bg-pcb-surface/50 text-xs px-3 py-2 mb-3 outline-none focus:border-pcb-copper/50">
            {boards.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.grid_width}x{b.grid_height})</option>)}
          </select>
          <FileUpload onUploaded={(b) => { loadBoards(); setSelectedBoardId(b.id); }} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-[10px] font-semibold text-pcb-muted uppercase tracking-wider mb-1 block">Ants</label><input type="number" value={ants} onChange={(e) => setAnts(e.target.value)} className="w-full rounded-md bg-pcb-bg border border-pcb-border text-xs px-2 py-1.5 outline-none focus:border-pcb-copper/50" /></div>
          <div><label className="text-[10px] font-semibold text-pcb-muted uppercase tracking-wider mb-1 block">Iterations</label><input type="number" value={iterations} onChange={(e) => setIterations(e.target.value)} className="w-full rounded-md bg-pcb-bg border border-pcb-border text-xs px-2 py-1.5 outline-none focus:border-pcb-copper/50" /></div>
        </div>

        <div className="flex p-1 bg-pcb-surface border border-pcb-border rounded-lg">
          <button onClick={() => setActiveTab("modes")} className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${activeTab === "modes" ? "bg-pcb-copper/20 text-pcb-copper" : "text-pcb-muted hover:text-pcb-text"}`}>Modes</button>
          <button onClick={() => setActiveTab("sweep")} className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${activeTab === "sweep" ? "bg-pcb-copper/20 text-pcb-copper" : "text-pcb-muted hover:text-pcb-text"}`}>Sweep</button>
        </div>

        <div className="rounded-lg border border-pcb-border bg-pcb-surface/40 p-4 flex flex-col min-h-[350px]">
          {activeTab === "modes" ? (
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                {Object.values(ACO_MODES).map((m) => (
                  <div key={m.label} className="text-[10px] bg-pcb-bg border border-pcb-border p-2.5 rounded-md">
                    <span className="font-semibold text-pcb-text block">{m.label}</span>
                    <span className="text-pcb-muted font-mono mt-1 block">α:{m.alpha} | β:{m.beta} | evap:{m.evaporation_rate}</span>
                  </div>
                ))}
              </div>
              <button onClick={startModeComparison} disabled={running || !selectedBoardId} className="w-full py-2.5 mt-4 rounded-lg text-xs font-semibold border border-pcb-copper/40 bg-pcb-copper/10 text-pcb-copper hover:bg-pcb-copper/20 disabled:opacity-40 transition-colors"><ChevronsRight className="w-3.5 h-3.5 inline mr-1.5" /> Run Comparison</button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-semibold text-pcb-muted uppercase tracking-wider mb-1 block">Sweep Parameter</label>
                  <select value={sweepField} onChange={(e) => {setSweepField(e.target.value); setSweepStep(SWEEP_FIELDS[e.target.value].defaultStep);}} className="w-full rounded-md bg-pcb-bg border border-pcb-border text-xs px-2 py-1.5 outline-none focus:border-pcb-copper/50">
                    {Object.entries(SWEEP_FIELDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-pcb-border/40">
                  <div><label className="text-[9px] font-semibold text-pcb-muted uppercase mb-1 block">Start</label><input type="number" step="0.1" value={sweepMin} onChange={(e) => setSweepMin(e.target.value)} className="w-full rounded-md bg-pcb-bg border border-pcb-border text-xs px-2 py-1.5 font-mono outline-none focus:border-pcb-copper/50" /></div>
                  <div><label className="text-[9px] font-semibold text-pcb-muted uppercase mb-1 block">End</label><input type="number" step="0.1" value={sweepMax} onChange={(e) => setSweepMax(e.target.value)} className="w-full rounded-md bg-pcb-bg border border-pcb-border text-xs px-2 py-1.5 font-mono outline-none focus:border-pcb-copper/50" /></div>
                  <div><label className="text-[9px] font-semibold text-pcb-muted uppercase mb-1 block">Step</label><input type="number" step="0.1" value={sweepStep} onChange={(e) => setSweepStep(e.target.value)} className="w-full rounded-md bg-pcb-bg border border-pcb-border text-xs px-2 py-1.5 font-mono outline-none focus:border-pcb-copper/50" /></div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-pcb-muted uppercase tracking-wider block">Constants</label>
                  <div className="grid grid-cols-2 gap-2">
                    {sweepField !== 'alpha' && <div><label className="text-[9px] font-semibold text-pcb-muted uppercase mb-1 block">Alpha</label><input type="number" value={fixedAlpha} onChange={(e) => setFixedAlpha(e.target.value)} className="w-full rounded-md bg-pcb-bg border border-pcb-border text-[11px] px-2 py-1.5 outline-none focus:border-pcb-copper/50" /></div>}
                    {sweepField !== 'beta' && <div><label className="text-[9px] font-semibold text-pcb-muted uppercase mb-1 block">Beta</label><input type="number" value={fixedBeta} onChange={(e) => setFixedBeta(e.target.value)} className="w-full rounded-md bg-pcb-bg border border-pcb-border text-[11px] px-2 py-1.5 outline-none focus:border-pcb-copper/50" /></div>}
                    {sweepField !== 'evaporation_rate' && <div><label className="text-[9px] font-semibold text-pcb-muted uppercase mb-1 block">Evap</label><input type="number" value={fixedEvap} onChange={(e) => setFixedEvap(e.target.value)} className="w-full rounded-md bg-pcb-bg border border-pcb-border text-[11px] px-2 py-1.5 outline-none focus:border-pcb-copper/50" /></div>}
                  </div>
                </div>
              </div>
              <button onClick={startSweep} disabled={running || !selectedBoardId} className="w-full py-2.5 mt-4 rounded-lg text-xs font-semibold border border-pcb-copper/40 bg-pcb-copper/10 text-pcb-copper hover:bg-pcb-copper/20 disabled:opacity-40 transition-colors"><Play className="w-3.5 h-3.5 inline mr-1.5" /> Start Sweep</button>
            </div>
          )}
          
          {error && <p className="text-[10px] text-pcb-danger bg-pcb-danger/10 p-2 rounded-md mt-2 border border-pcb-danger/20">{error}</p>}
          
          <button 
            onClick={() => { stopRef.current = true; setRunning(false); }} 
            disabled={!running}
            className={`w-full py-2 mt-2 rounded-lg text-xs font-medium border transition-colors border-pcb-border text-pcb-danger hover:bg-pcb-danger/5`}
          >
            <Square className="w-3.5 h-3.5 inline mr-1.5" /> Stop Execution
          </button>

        </div>
      </div>

      <div className="flex-1 min-w-0 bg-pcb-bg p-5 overflow-y-auto space-y-5">
        <div className="rounded-xl border border-pcb-border bg-pcb-surface/20 p-4">
          <h3 className="text-xs font-semibold text-pcb-muted uppercase tracking-wider mb-4 flex items-center gap-2"><SlidersHorizontal className="w-3.5 h-3.5" /> Fitness Curves</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: 6 }}>
                <CartesianGrid stroke="#30363d" strokeDasharray="3 3" />
                <XAxis dataKey="iter" tick={{fill: "#8b949e", fontSize: 10}} /><YAxis tick={{fill: "#8b949e", fontSize: 10}} width={48} />
                <Tooltip cursor={{stroke: "#484f58"}} contentStyle={{background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11}} /><Legend wrapperStyle={{fontSize: 11}} />
                {chartSeries.map((s, idx) => <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={SERIES_COLORS[idx % SERIES_COLORS.length]} dot={false} strokeWidth={2} connectNulls />)}
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-xs text-pcb-muted italic py-10 text-center">Run modes or sweep to see results.</p>}
        </div>

        <div className="rounded-xl border border-pcb-border bg-pcb-surface/20 p-4 overflow-x-auto">
          <h3 className="text-xs font-semibold text-pcb-muted uppercase tracking-wider mb-3">Execution Log</h3>
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="text-left text-pcb-muted border-b border-pcb-border">
                <th className="py-2.5 pr-3 font-semibold">Config / Value</th>
                <th className="py-2.5 pr-3 font-semibold">Status</th>
                <th className="py-2.5 pr-3 font-semibold">Run ID</th>
                <th className="py-2.5 pr-3 font-semibold text-right">Time (s)</th>
                <th className="py-2.5 pr-3 font-semibold text-right">Best Fitness</th>
                <th className="py-2.5 font-semibold text-right">Success Rate</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {runs.map((r) => {
                const best = r.history.length ? Math.min(...r.history) : null;
                return (
                  <tr key={r.key} className="border-b border-pcb-border/60 last:border-0 hover:bg-pcb-surface/30 transition-colors">
                    <td className="py-2.5 pr-3 text-pcb-text font-sans">{r.label}</td>
                    <td className="py-2.5 pr-3 font-sans text-pcb-muted">{r.status}</td>
                    <td className="py-2.5 pr-3">{r.runId ? String(r.runId).slice(0, 8) : "—"}</td>
                    <td className="py-2.5 pr-3 text-right text-pcb-muted">{r.duration != null ? r.duration.toFixed(2) : "—"}</td>
                    <td className="py-2.5 pr-3 text-right text-pcb-copper">{best != null ? best.toFixed(2) : "—"}</td>
                    <td className="py-2.5 text-right">{r.metrics?.success_rate != null ? `${(r.metrics.success_rate * 100).toFixed(1)}%` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}