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
export default function RuntimeScatterChart({ runs, boardById }) {
  const completed = (runs || []).filter(
    (r) => r.status === "completed" && r.duration_seconds != null && r.board_id,
  );

  const scatterPts = completed
    .map((r) => {
      const b = boardById?.get(String(r.board_id));
      const complexity = boardComplexity(b);
      if (complexity == null) return null;
      return {
        complexity,
        duration: r.duration_seconds,
        algorithm: r.algorithm,
        board: r.board_name || b?.name || "—",
      };
    })
    .filter(Boolean);

  if (scatterPts.length === 0) {
    return (
      <p className="text-xs text-pcb-muted italic py-6 text-center rounded-xl border border-pcb-border bg-pcb-surface/20">
        No completed runs with board geometry yet — run optimizations from Analysis, then refresh this page.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-pcb-border bg-pcb-surface/20 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-pcb-muted uppercase tracking-wider">
          Time dependence on complexity of problem for different methods
        </h3>
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
            dataKey="duration"
            name="duration"
            tick={{ fill: "#8b949e", fontSize: 9 }}
            width={52}
            label={{ value: "Duration (s)", angle: -90, fill: "#8b949e", fontSize: 10, position: "insideLeft" }}
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
                <div className="bg-[#161b22] border border-pcb-border rounded-lg px-3 py-2 text-xs shadow-xl max-w-xs">
                  <p className="font-medium text-pcb-text">{p.board}</p>
                  <p className="text-pcb-muted mt-1">Algorithm: <span className="text-pcb-text">{p.algorithm}</span></p>
                  <p className="text-pcb-muted">Size: <span className="font-mono text-pcb-text">{p.complexity.toLocaleString()}</span></p>
                  <p className="text-pcb-muted">Duration: <span className="font-mono text-pcb-text">{p.duration.toFixed(2)}s</span></p>
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
