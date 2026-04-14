import { useMemo, useRef, useState } from "react";
import { SlidersHorizontal, Play, Square, ChevronsRight } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import BoardSelector from "../components/BoardSelector";
import SweepHistory from "../components/SweepHistory";
import RunDetailModal from "../components/RunDetailModal";
import { api } from "../api/client";

const SWEEP_FIELDS = {
  mutation_rate: { label: "Mutation Rate", min: 0, max: 1, step: 0.01, defaultStep: 0.05 },
  crossover_rate: { label: "Crossover Rate", min: 0, max: 1, step: 0.01, defaultStep: 0.1 },
};

const GA_MODES = {
  balanced: { label: "Balanced", mutation: 0.1, crossover: 0.8 },
  exploration: { label: "High Mutation", mutation: 0.25, crossover: 0.6 },
  exploitation: { label: "High Crossover", mutation: 0.02, crossover: 0.95 },
};

const SERIES_COLORS = ["#58a6ff", "#3fb950", "#d29922", "#f85149", "#a371f7", "#79c0ff"];
const POLL_DELAY_MS = 2500;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildSweepValues(min, max, step) {
  const out = [];
  const safeStep = step > 0 ? step : 0.01;
  for (let v = min; v <= max + 1e-9; v += safeStep) {
    out.push(Number(v.toFixed(6)));
  }
  return out;
}

export default function GAExplorerView({ boards, selectedBoardId, setSelectedBoardId }) {
  const [activeTab, setActiveTab] = useState("modes");

  const [popSize, setPopSize] = useState(50);
  const [gens, setGens] = useState(100);

  const [fixedMutation, setFixedMutation] = useState(0.1);
  const [fixedCrossover, setFixedCrossover] = useState(0.8);

  const [sweepField, setSweepField] = useState("mutation_rate");
  const [sweepMin, setSweepMin] = useState(0.05);
  const [sweepMax, setSweepMax] = useState(0.2);
  const [sweepStep, setSweepStep] = useState(0.05);

  const [runs, setRuns] = useState([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalRun, setModalRun] = useState(null);

  const stopRef = useRef(false);
  const activeSweepIdRef = useRef(null);
  const viewedSweepIdRef = useRef(null);

  const chartSeries = useMemo(() => runs.filter((r) => r.status === "completed" && r.history.length > 0), [runs]);
  const chartData = useMemo(() => {
    if (!chartSeries.length) return [];
    const maxLen = Math.max(...chartSeries.map((s) => s.history.length));
    const rows = [];
    for (let i = 0; i < maxLen; i += 1) {
      const row = { iter: i + 1 };
      chartSeries.forEach((s) => { if (i < s.history.length) row[s.key] = s.history[i]; });
      rows.push(row);
    }
    return rows;
  }, [chartSeries]);

  const executeRuns = async (runConfigs, sweepTarget) => {
    setError(null);
    setRuns([]);
    setRunning(true);
    stopRef.current = false;

    const currentSweepId = `sweep_${Date.now()}`;
    activeSweepIdRef.current = currentSweepId;
    viewedSweepIdRef.current = currentSweepId;

    const updateViewIfActive = (updater) => {
      if (viewedSweepIdRef.current === currentSweepId) {
        setRuns(updater);
      }
    };

    for (const config of runConfigs) {
      if (stopRef.current) break;
      
      updateViewIfActive(prev => [
        ...prev, 
        { key: config.key, label: config.label, runId: null, status: "starting", history: [], duration: null, metrics: null, error: null }
      ]);

      try {
        const params = {
          population_size: Number(popSize),
          generations: Number(gens),
          mutation_rate: config.mutation,
          crossover_rate: config.crossover,
          sweep_id: currentSweepId,
          sweep_target: sweepTarget
        };

        const run = await api.startRun(selectedBoardId, "ga", params);
        
        updateViewIfActive(prev => prev.map(r => r.key === config.key ? { ...r, runId: run.id, status: "running" } : r));

        let finalRun = null;
        while (!stopRef.current) {
          finalRun = await api.getRun(run.id);
          if (finalRun.status === "completed" || finalRun.status === "failed") break;
          await sleep(POLL_DELAY_MS);
        }

        if (!finalRun) {
          updateViewIfActive((prev) => prev.map((r) => (r.key === config.key ? { ...r, status: "stopped" } : r)));
          break;
        }

        const completed = finalRun.status === "completed";
        updateViewIfActive(prev => prev.map(r => r.key !== config.key ? r : {
          ...r,
          status: completed ? "completed" : "failed",
          history: completed ? (finalRun.result.fitness_history || []) : [],
          duration: finalRun.duration_seconds,
          metrics: completed ? finalRun.result.metrics : null,
          error: finalRun.error_message || null
        }));
      } catch (e) {
        updateViewIfActive(prev => prev.map(r => r.key === config.key ? { ...r, status: "failed", error: e.message } : r));
      }
    }
    
    if (activeSweepIdRef.current === currentSweepId) {
      setRunning(false);
      activeSweepIdRef.current = null;
    }
  };

  const startModeComparison = () => {
    if (!selectedBoardId || running) return;
    const configs = Object.entries(GA_MODES).map(([key, mode]) => ({
      key,
      label: mode.label,
      mutation: mode.mutation,
      crossover: mode.crossover
    }));
    executeRuns(configs, "modes");
  };

  const startSweep = () => {
    if (!selectedBoardId || running) return;
    const min = Number(sweepMin), max = Number(sweepMax), step = Number(sweepStep);
    if (min >= max || step <= 0) { setError("Range invalid: ensure End > Start and Step > 0."); return; }

    const vals = buildSweepValues(min, max, step);
    const configs = vals.map(v => ({
      key: `v_${v}`,
      label: `${sweepField}=${v}`,
      mutation: sweepField === 'mutation_rate' ? v : Number(fixedMutation),
      crossover: sweepField === 'crossover_rate' ? v : Number(fixedCrossover),
    }));

    executeRuns(configs, sweepField);
  };

  const handleSelectPastSweep = (session) => {
    viewedSweepIdRef.current = session.id;

    if (session.target_field === "modes") {
      setActiveTab("modes");
    } else {
      setActiveTab("sweep");
      setSweepField(session.target_field);
    }

    const loadedRuns = session.runs.map(run => {
      let label = "Past Run";
      let coeffVal = "?";

      if (session.target_field === "modes") {
        const mVal = run.parameters?.mutation_rate;
        const cVal = run.parameters?.crossover_rate;
        const modeEntry = Object.entries(GA_MODES).find(([, v]) => v.mutation === mVal && v.crossover === cVal);
        label = modeEntry ? modeEntry[1].label : `Mut: ${mVal} | Cross: ${cVal}`;
        coeffVal = modeEntry ? modeEntry[0] : "custom";
      } else {
        coeffVal = run.parameters?.[session.target_field];
        label = `${session.target_field}=${coeffVal}`;
      }

      return {
        key: `past_${run.id}`,
        label: label,
        coeffValue: coeffVal,
        runId: run.id,
        status: run.status,
        history: run.result?.fitness_history || [],
        duration: run.duration_seconds,
        metrics: run.result?.metrics,
        error: run.error_message || null,
      };
    });

    if (session.target_field !== "modes") {
      loadedRuns.sort((a, b) => Number(a.coeffValue) - Number(b.coeffValue));
    }
    setRuns(loadedRuns);
  };

  return (
    <div className="flex-1 flex min-h-0">
      <div className="w-96 border-r border-pcb-border bg-pcb-surface/20 overflow-y-auto flex flex-col p-4 space-y-5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-pcb-accent" />
          <h2 className="text-sm font-semibold">GA Explorer</h2>
        </div>
        
        <BoardSelector 
          boards={boards} 
          selectedId={selectedBoardId} 
          onChange={setSelectedBoardId} 
        />
        
        <p className="text-xs text-pcb-muted leading-relaxed">
          Investigate algorithm behavior: compare pre-defined strategies or perform precise parameter sweeps.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-pcb-muted uppercase tracking-wider mb-1 block">Population</label>
            <input type="number" value={popSize} onChange={e => setPopSize(e.target.value)} className="w-full rounded-md bg-pcb-bg border border-pcb-border text-xs px-2 py-1.5 outline-none focus:border-pcb-accent/50" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-pcb-muted uppercase tracking-wider mb-1 block">Iterations</label>
            <input type="number" value={gens} onChange={e => setGens(e.target.value)} className="w-full rounded-md bg-pcb-bg border border-pcb-border text-xs px-2 py-1.5 outline-none focus:border-pcb-accent/50" />
          </div>
        </div>

        <div className="flex p-1 bg-pcb-surface border border-pcb-border rounded-lg">
          <button onClick={() => setActiveTab("modes")} className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${activeTab === "modes" ? "bg-pcb-accent/20 text-pcb-accent" : "text-pcb-muted hover:text-pcb-text"}`}>Modes</button>
          <button onClick={() => setActiveTab("sweep")} className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${activeTab === "sweep" ? "bg-pcb-accent/20 text-pcb-accent" : "text-pcb-muted hover:text-pcb-text"}`}>Sweep</button>
        </div>

        <div className="rounded-lg border border-pcb-border bg-pcb-surface/40 p-4 flex flex-col min-h-[350px]">
          {activeTab === "modes" ? (
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                {Object.values(GA_MODES).map(m => (
                  <div key={m.label} className="text-[10px] bg-pcb-bg border border-pcb-border p-2.5 rounded-md">
                    <span className="font-semibold text-pcb-text block">{m.label}</span>
                    <span className="text-pcb-muted font-mono mt-1 block">mut:{m.mutation} | cross:{m.crossover}</span>
                  </div>
                ))}
              </div>
              <button onClick={startModeComparison} disabled={running || !selectedBoardId} className="w-full py-2.5 mt-4 rounded-lg text-xs font-semibold border border-pcb-accent/40 bg-pcb-accent/10 text-pcb-accent hover:bg-pcb-accent/20 disabled:opacity-40 transition-colors">
                <ChevronsRight className="w-3.5 h-3.5 inline mr-1.5" /> Run Comparison
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-semibold text-pcb-muted uppercase tracking-wider mb-1 block">Sweep Parameter</label>
                  <select value={sweepField} onChange={e => {setSweepField(e.target.value); setSweepStep(SWEEP_FIELDS[e.target.value].defaultStep);}} className="w-full rounded-md bg-pcb-bg border border-pcb-border text-xs px-2 py-1.5 outline-none focus:border-pcb-accent/50">
                    {Object.entries(SWEEP_FIELDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-pcb-border/40">
                  <div>
                    <label className="text-[9px] font-semibold text-pcb-muted uppercase mb-1 block">Start</label>
                    <input type="number" step="0.01" value={sweepMin} onChange={e => setSweepMin(e.target.value)} className="w-full rounded-md bg-pcb-bg border border-pcb-border text-xs px-2 py-1.5 font-mono outline-none focus:border-pcb-accent/50" />
                  </div>
                  <div>
                    <label className="text-[9px] font-semibold text-pcb-muted uppercase mb-1 block">End</label>
                    <input type="number" step="0.01" value={sweepMax} onChange={e => setSweepMax(e.target.value)} className="w-full rounded-md bg-pcb-bg border border-pcb-border text-xs px-2 py-1.5 font-mono outline-none focus:border-pcb-accent/50" />
                  </div>
                  <div>
                    <label className="text-[9px] font-semibold text-pcb-muted uppercase mb-1 block">Step</label>
                    <input type="number" step="0.01" value={sweepStep} onChange={e => setSweepStep(e.target.value)} className="w-full rounded-md bg-pcb-bg border border-pcb-border text-xs px-2 py-1.5 font-mono outline-none focus:border-pcb-accent/50" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-pcb-muted uppercase tracking-wider block">Constants</label>
                  <div className="grid grid-cols-2 gap-2">
                    {sweepField !== 'mutation_rate' && (
                      <div>
                        <label className="text-[9px] font-semibold text-pcb-muted uppercase mb-1 block">Mutation</label>
                        <input type="number" value={fixedMutation} onChange={e => setFixedMutation(e.target.value)} className="w-full rounded-md bg-pcb-bg border border-pcb-border text-[11px] px-2 py-1.5 outline-none focus:border-pcb-accent/50" />
                      </div>
                    )}
                    {sweepField !== 'crossover_rate' && (
                      <div>
                        <label className="text-[9px] font-semibold text-pcb-muted uppercase mb-1 block">Crossover</label>
                        <input type="number" value={fixedCrossover} onChange={e => setFixedCrossover(e.target.value)} className="w-full rounded-md bg-pcb-bg border border-pcb-border text-[11px] px-2 py-1.5 outline-none focus:border-pcb-accent/50" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={startSweep} disabled={running || !selectedBoardId} className="w-full py-2.5 mt-4 rounded-lg text-xs font-semibold border border-pcb-accent/40 bg-pcb-accent/10 text-pcb-accent hover:bg-pcb-accent/20 disabled:opacity-40 transition-colors">
                <Play className="w-3.5 h-3.5 inline mr-1.5" /> Start Sweep
              </button>
            </div>
          )}
          
          {error && <p className="text-[10px] text-pcb-danger bg-pcb-danger/10 p-2 rounded-md mt-2 border border-pcb-danger/20">{error}</p>}
          
          <button 
            onClick={() => { stopRef.current = true; setRunning(false); activeSweepIdRef.current = null; }} 
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
                const best = r.history.length ? Math.max(...r.history) : null;
                return (
                  <tr key={r.key} className="border-b border-pcb-border/60 last:border-0 hover:bg-pcb-surface/30 transition-colors">
                    <td className="py-2.5 pr-3 text-pcb-text font-sans">{r.label}</td>
                    <td className="py-2.5 pr-3 font-sans text-pcb-muted">{r.status}</td>
                    <td className="py-2.5 pr-3 cursor-pointer hover:text-pcb-accent" onClick={() => { setModalRun({id: r.runId, algorithm: "ga"}); setModalOpen(true); }}>
                      {r.runId ? String(r.runId).slice(0, 8) : "—"}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-pcb-muted">{r.duration != null ? r.duration.toFixed(2) : "—"}</td>
                    <td className="py-2.5 pr-3 text-right text-pcb-accent">{best != null ? best.toFixed(2) : "—"}</td>
                    <td className="py-2.5 text-right">{r.metrics?.success_rate != null ? `${(r.metrics.success_rate * 100).toFixed(1)}%` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="w-[22rem] border-l border-pcb-border bg-pcb-surface/20 overflow-y-auto shrink-0 p-4">
        <SweepHistory
          boardId={selectedBoardId}
          algorithm="ga"
          onSelectSweep={handleSelectPastSweep}
          refreshTrigger={running}
        />
      </div>

      <RunDetailModal open={modalOpen} onClose={() => { setModalOpen(false); setModalRun(null); }} run={modalRun} />
    </div>
  );
}