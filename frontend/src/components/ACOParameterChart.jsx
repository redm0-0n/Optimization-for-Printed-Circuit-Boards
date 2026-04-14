import { useState, useMemo } from "react";
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
import { resolveAlgorithmParameters } from "../config/algorithmPresets";

const TOOLTIP_BOX = {
  background: "#161b22",
  border: "1px solid #30363d",
  borderRadius: 8,
  fontSize: 11,
  color: "#c9d1d9",
};

export default function ACOParameterChart({ runs }) {
  const [xAxisField, setXAxisField] = useState("alpha");

  const scatterData = useMemo(() => {
    const acoRuns = (runs || []).filter(
      (r) => r.status === "completed" && r.algorithm === "aco" && r.result?.fitness_history
    );

    return acoRuns.map((r) => {
      const params = resolveAlgorithmParameters("aco", r.parameters);
      const history = r.result.fitness_history || [];
      const bestFitness = history.length > 0 ? Math.min(...history) : null;
      
      return {
        id: r.id,
        board: r.board_name || "—",
        alpha: params.alpha,
        beta: params.beta,
        evaporation_rate: params.evaporation_rate,
        fitness: bestFitness,
        duration: r.duration_seconds,
      };
    }).filter(d => d.fitness != null && d[xAxisField] != null);
  }, [runs, xAxisField]);

  if (scatterData.length === 0) {
    return (
      <div className="rounded-xl border border-pcb-border bg-pcb-surface/20 p-6 text-center">
        <p className="text-xs text-pcb-muted italic">
          There are no completed ACO runs with metrics. Launch ACO Explorer to collect data.
        </p>
      </div>
    );
  }

  const xValues = scatterData.map(d => d[xAxisField]);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const paddingX = (maxX - minX) * 0.1 || 0.5;

  return (
    <div className="rounded-xl border border-pcb-border bg-pcb-surface/20 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-pcb-muted uppercase tracking-wider">
          Fitness dependence on ACO parameters
        </h3>
        <select
          value={xAxisField}
          onChange={(e) => setXAxisField(e.target.value)}
          className="text-xs bg-pcb-bg border border-pcb-border rounded-lg px-2 py-1 text-pcb-text"
        >
          <option value="alpha">Alpha (Pheromone)</option>
          <option value="beta">Beta (Heuristic)</option>
          <option value="evaporation_rate">Evaporation Rate</option>
        </select>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 12, right: 12, bottom: 28, left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis
            type="number"
            dataKey={xAxisField}
            name={xAxisField}
            domain={[minX - paddingX, maxX + paddingX]}
            tick={{ fill: "#8b949e", fontSize: 9 }}
            label={{ value: `Value of ${xAxisField}`, fill: "#8b949e", fontSize: 10, position: "bottom", offset: 4 }}
          />
          <YAxis
            type="number"
            dataKey="fitness"
            name="Best Fitness"
            tick={{ fill: "#8b949e", fontSize: 9 }}
            width={52}
            label={{ value: "Best Fitness", angle: -90, fill: "#8b949e", fontSize: 10, position: "insideLeft" }}
          />
          <ZAxis dataKey="duration" range={[40, 120]} /> {/* Размер точки зависит от времени */}
          <Tooltip
            cursor={{ strokeDasharray: "3 3", stroke: "#484f58" }}
            contentStyle={TOOLTIP_BOX}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const p = payload[0].payload;
              return (
                <div className="bg-[#161b22] border border-pcb-border rounded-lg px-3 py-2 text-xs shadow-xl max-w-xs">
                  <p className="font-medium text-pcb-text mb-1">{p.board}</p>
                  <p className="text-pcb-muted">Best Fitness: <span className="font-mono text-pcb-accent">{p.fitness.toFixed(2)}</span></p>
                  <p className="text-pcb-muted">Alpha: <span className="font-mono text-pcb-text">{p.alpha}</span></p>
                  <p className="text-pcb-muted">Beta: <span className="font-mono text-pcb-text">{p.beta}</span></p>
                  <p className="text-pcb-muted">Evaporation: <span className="font-mono text-pcb-text">{p.evaporation_rate}</span></p>
                  <p className="text-pcb-muted mt-1">Duration: <span className="font-mono text-pcb-text">{p.duration.toFixed(2)}s</span></p>
                </div>
              );
            }}
          />
          <Scatter name="ACO Runs" data={scatterData} fill="#d29922">
            {scatterData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill="#d29922" opacity={0.7} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}