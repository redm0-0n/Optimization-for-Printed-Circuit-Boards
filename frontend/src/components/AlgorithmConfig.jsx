import { useState } from "react";
import { Play, Settings2 } from "lucide-react";
import { api } from "../api/client.js";
import { PRESETS, ALGO_LABELS, ALGO_DESC } from "../config/algorithmPresets";

export default function AlgorithmConfig({ boardId, onRunStart }) {
  const [algo, setAlgo] = useState("baseline");
  const [params, setParams] = useState({});
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  const fields = PRESETS[algo];

  const updateParam = (key, value) =>
    setParams((p) => ({ ...p, [key]: parseFloat(value) }));

  const handleStart = async () => {
    if (!boardId) return;
    setStarting(true);
    setError(null);
    try {
      const run = await api.startRun(boardId, algo, params);
      if (onRunStart) onRunStart(run);
    } catch (e) {
      setError(e.message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Algorithm selector */}
      <div>
        <label className="text-xs font-semibold text-pcb-muted uppercase tracking-wider mb-2 block">
          Algorithm
        </label>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(ALGO_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setAlgo(key); setParams({}); }}
              className={`px-3 py-2.5 rounded-lg text-xs font-medium transition-all border
                ${algo === key
                  ? "bg-pcb-accent/15 border-pcb-accent/40 text-pcb-accent shadow-sm shadow-pcb-accent/5"
                  : "bg-pcb-surface border-pcb-border text-pcb-muted hover:text-pcb-text hover:border-pcb-muted/50"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-pcb-muted leading-relaxed">{ALGO_DESC[algo]}</p>

      {/* Parameters */}
      {Object.keys(fields).length > 0 && (
        <div className="space-y-3 fade-in-up">
          <div className="flex items-center gap-2 text-xs font-semibold text-pcb-muted uppercase tracking-wider">
            <Settings2 className="w-3.5 h-3.5" />
            Parameters
          </div>
          <div className="space-y-2.5 bg-pcb-surface/50 rounded-lg border border-pcb-border p-3.5">
            {Object.entries(fields).map(([key, cfg]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <label className="text-xs text-pcb-text whitespace-nowrap">{cfg.label}</label>
                <input
                  type={cfg.type}
                  min={cfg.min}
                  max={cfg.max}
                  step={cfg.step || 1}
                  value={params[key] ?? cfg.default}
                  onChange={(e) => updateParam(key, e.target.value)}
                  className="w-24 px-2.5 py-1.5 rounded-md bg-pcb-bg border border-pcb-border
                    text-xs text-pcb-text text-right font-mono
                    focus:outline-none focus:border-pcb-accent/50 focus:ring-1 focus:ring-pcb-accent/20
                    transition-all"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-pcb-danger bg-pcb-danger/10 border border-pcb-danger/20 rounded-lg px-3 py-2 fade-in-up">
          {error}
        </p>
      )}

      {/* Run button */}
      <button
        onClick={handleStart}
        disabled={!boardId || starting}
        className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2
          transition-all duration-200
          ${!boardId
            ? "bg-pcb-border/30 text-pcb-muted cursor-not-allowed"
            : starting
              ? "bg-pcb-accent/20 text-pcb-accent cursor-wait"
              : "bg-pcb-accent text-pcb-bg hover:bg-pcb-accent/90 hover:shadow-lg hover:shadow-pcb-accent/15 active:scale-[0.98]"}`}
      >
        {starting ? (
          <>
            <div className="w-4 h-4 border-2 border-pcb-accent border-t-transparent rounded-full animate-spin" />
            Starting…
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Run {ALGO_LABELS[algo]}
          </>
        )}
      </button>
    </div>
  );
}