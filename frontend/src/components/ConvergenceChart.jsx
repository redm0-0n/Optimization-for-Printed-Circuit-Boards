import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingUp } from "lucide-react";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-pcb-surface border border-pcb-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[10px] text-pcb-muted mb-0.5">Generation {label}</p>
      <p className="text-xs font-mono text-pcb-accent font-semibold">
        {payload[0].value.toFixed(2)}
      </p>
    </div>
  );
};

export default function ConvergenceChart({ history, algorithm }) {
  if (!history || history.length < 2) return null;

  const data = history.map((val, idx) => ({ idx, val }));
  const minY = Math.min(...history);
  const maxY = Math.max(...history);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-pcb-muted uppercase tracking-wider flex items-center gap-2">
        <TrendingUp className="w-3.5 h-3.5" /> Convergence — {algorithm}
      </h3>
      <div className="bg-pcb-surface/40 border border-pcb-border rounded-lg p-3">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="idx"
              tick={{ fill: "#8b949e", fontSize: 9 }}
              axisLine={{ stroke: "#30363d" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#8b949e", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              domain={[minY - Math.abs(minY) * 0.1, maxY + Math.abs(maxY) * 0.1]}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={maxY}
              stroke="#00d68f"
              strokeDasharray="4 4"
              strokeOpacity={0.4}
            />
            <Line
              type="monotone"
              dataKey="val"
              stroke="#00d68f"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#00d68f", stroke: "#0c1117", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex justify-between mt-2 text-[10px] font-mono text-pcb-muted">
          <span>Best: {maxY.toFixed(2)}</span>
          <span>{history.length} iterations</span>
        </div>
      </div>
    </div>
  );
}