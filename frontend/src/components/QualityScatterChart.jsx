import React, { useState } from "react";
import {
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { boardComplexity } from "../utils/boardStats";

const ALGO_COLOR = {
  baseline: "#58a6ff",
  ga: "#3fb950",
  aco: "#d29922",
};

const TOOLTIP_BOX = {
  background: "#161b22",
  border: "1px solid #30363d",
  borderRadius: 8,
  fontSize: 11,
  color: "#c9d1d9",
};

/** @param {Array} runs @param {Map<string, object>} boardById */
export default function QualityScatterChart({ runs, boardById }) {
  const [weights, setWeights] = useState({
    wireLen: 1.0,
    maxCong: 2.0,
    overflow: 5.0,
    infeasible: 1000.0,
  });

  const handleWeightChange = (e) => {
    const { name, value } = e.target;
    setWeights((prev) => ({
      ...prev,
      [name]: parseFloat(value),
    }));
  };

  const completed = (runs || []).filter((r) => {
    const hasMetrics = r.metrics != null || r.result?.metrics != null;
    return r.status === "completed" && hasMetrics && r.board_id;
  });

  const scatterPts = completed
    .map((r) => {
      const b = boardById?.get(String(r.board_id));
      const complexity = boardComplexity(b);
      const m = r.metrics || r.result?.metrics;
      if (complexity == null || !m) return null;

      const successRate = m.success_rate || 0;
      const wireLen = m.wire_length || 0;
      const overflow = m.overflow || 0;
      const maxCong = m.max_congestion || 0;

      const score =
        (wireLen / 10) * weights.wireLen +
        maxCong * weights.maxCong +
        overflow * weights.overflow +
        (1 - successRate) * weights.infeasible;

      return {
        complexity,
        score,
        successRate,
        wireLen,
        overflow,
        maxCong,
        algorithm: r.algorithm,
        board: r.board_name || b?.name || "—",
      };
    })
    .filter(Boolean);

  if (scatterPts.length === 0) {
    return (
      <p className="text-xs text-pcb-muted italic py-6 text-center rounded-xl border border-pcb-border bg-pcb-surface/20">
        No completed runs with metrics yet — run optimizations from Analysis, then refresh this page.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-pcb-border bg-pcb-surface/20 p-4 flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
        <h3 className="text-xs font-semibold text-pcb-muted uppercase tracking-wider">
          Routing Quality on complexity of problem for different methods
        </h3>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5 p-3 rounded-lg border border-pcb-border bg-[#0d1117] shadow-inner">
        
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[10px] text-pcb-muted">
            <span className="font-semibold uppercase tracking-wide">Wire Length W.</span>
            <span className="font-mono bg-[#161b22] px-1.5 py-0.5 rounded border border-pcb-border text-pcb-text">{weights.wireLen.toFixed(1)}</span>
          </div>
          <input type="range" name="wireLen" min="0" max="10" step="0.5" value={weights.wireLen} onChange={handleWeightChange} className="w-full accent-pcb-text h-1 bg-pcb-border rounded-lg appearance-none cursor-pointer" />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[10px] text-pcb-muted">
            <span className="font-semibold uppercase tracking-wide">Congestion W.</span>
            <span className="font-mono bg-[#161b22] px-1.5 py-0.5 rounded border border-pcb-border text-pcb-text">{weights.maxCong.toFixed(1)}</span>
          </div>
          <input type="range" name="maxCong" min="0" max="10" step="0.5" value={weights.maxCong} onChange={handleWeightChange} className="w-full accent-pcb-text h-1 bg-pcb-border rounded-lg appearance-none cursor-pointer" />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[10px] text-pcb-muted">
            <span className="font-semibold uppercase tracking-wide">Overflow W.</span>
            <span className="font-mono bg-[#161b22] px-1.5 py-0.5 rounded border border-pcb-border text-pcb-danger">{weights.overflow.toFixed(1)}</span>
          </div>
          <input type="range" name="overflow" min="0" max="20" step="1" value={weights.overflow} onChange={handleWeightChange} className="w-full accent-pcb-danger h-1 bg-pcb-border rounded-lg appearance-none cursor-pointer" />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[10px] text-pcb-muted">
            <span className="font-semibold uppercase tracking-wide">Fail Penalty</span>
            <span className="font-mono bg-[#161b22] px-1.5 py-0.5 rounded border border-pcb-border text-pcb-accent">{weights.infeasible.toFixed(0)}</span>
          </div>
          <input type="range" name="infeasible" min="0" max="2000" step="100" value={weights.infeasible} onChange={handleWeightChange} className="w-full accent-pcb-accent h-1 bg-pcb-border rounded-lg appearance-none cursor-pointer" />
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 12, right: 12, bottom: 28, left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis
            type="number"
            dataKey="complexity"
            name="complexity"
            tick={{ fill: "#8b949e", fontSize: 9 }}
            label={{ value: "Problem size (cells × nets)", fill: "#8b949e", fontSize: 10, position: "bottom", offset: 4 }}
          />
          <YAxis
            type="number"
            dataKey="score"
            name="Penalty Score"
            tick={{ fill: "#8b949e", fontSize: 9 }}
            width={52}
            label={{ value: "Penalty Cost", angle: -90, fill: "#8b949e", fontSize: 10, position: "insideLeft" }}
          />
          <ZAxis dataKey="complexity" range={[40, 40]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3", stroke: "#484f58", fill: "rgba(22, 27, 34, 0.55)" }}
            contentStyle={TOOLTIP_BOX}
            itemStyle={{ color: "#c9d1d9" }}
            labelStyle={{ color: "#8b949e" }}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const p = payload[0].payload;
              return (
                <div className="bg-[#161b22] border border-pcb-border rounded-lg px-3 py-2 text-xs shadow-xl max-w-xs space-y-1.5 z-50 relative">
                  <div>
                    <p className="font-medium text-pcb-text">{p.board}</p>
                    <p className="text-pcb-muted text-[10px] uppercase">Algorithm: <span className="font-bold" style={{ color: ALGO_COLOR[p.algorithm] }}>{p.algorithm}</span></p>
                  </div>
                  <div className="h-px bg-pcb-border" />
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                    <p className="text-pcb-muted">Success Rate:</p> <p className="text-right text-pcb-text font-mono">{(p.successRate * 100).toFixed(1)}%</p>
                    <p className="text-pcb-muted">Overflow:</p> <p className="text-right text-pcb-danger font-mono">{p.overflow}</p>
                    <p className="text-pcb-muted">Max Congestion:</p> <p className="text-right text-pcb-text font-mono">{p.maxCong.toFixed(2)}</p>
                    <p className="text-pcb-muted">Wire Length:</p> <p className="text-right text-pcb-text font-mono">{p.wireLen}</p>
                  </div>
                  <div className="h-px bg-pcb-border" />
                  <p className="text-pcb-muted text-[11px] font-bold">Total Penalty: <span className="font-mono text-pcb-accent">{p.score.toFixed(2)}</span></p>
                </div>
              );
            }}
          />
          <Scatter name="Runs" data={scatterPts} fill="#8884d8">
            {scatterPts.map((entry, index) => (
              <Cell key={`c-${index}`} fill={ALGO_COLOR[entry.algorithm] || "#8b949e"} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-pcb-muted">
        {["baseline", "ga", "aco"].map((a) => (
          <span key={a} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: ALGO_COLOR[a] }} />
            {a.toUpperCase()}
          </span>
        ))}
      </div>
    </div>
  );
}