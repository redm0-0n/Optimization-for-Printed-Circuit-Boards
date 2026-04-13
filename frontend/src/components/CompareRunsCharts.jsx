import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#58a6ff", "#3fb950", "#d29922", "#f85149", "#a371f7", "#79c0ff"];

const TOOLTIP_PROPS = {
  cursor: { fill: "rgba(22, 27, 34, 0.55)" },
  wrapperStyle: { outline: "none" },
  contentStyle: {
    background: "#161b22",
    border: "1px solid #30363d",
    borderRadius: 8,
    fontSize: 11,
    color: "#c9d1d9",
  },
  itemStyle: { color: "#c9d1d9" },
  labelStyle: { color: "#8b949e" },
};

function shortRunLabel(run) {
  const algo = (run.algorithm || "?").toUpperCase();
  const id = String(run.id).slice(0, 6);
  return `${algo}·${id}`;
}

/** Completed runs with result.metrics and optional fitness_history */
export default function CompareRunsCharts({ runs }) {
  const completed = (runs || []).filter((r) => r.status === "completed" && r.result?.metrics);
  if (completed.length < 2) return null;

  const barData = completed.map((r) => ({
    name: shortRunLabel(r),
    duration: r.duration_seconds ?? 0,
    wire: Number(r.result.metrics.total_wire_length) || 0,
    successPct: (Number(r.result.metrics.success_rate) || 0) * 100,
    overflow: Number(r.result.metrics.total_overflow) || 0,
  }));

  const maxGen = Math.max(
    0,
    ...completed.map((r) => (r.result.fitness_history || []).length),
  );
  const fitnessRows = [];
  for (let g = 0; g < maxGen; g++) {
    const row = { gen: g };
    completed.forEach((r, i) => {
      const h = r.result.fitness_history || [];
      if (g < h.length) row[`s${i}`] = h[g];
    });
    fitnessRows.push(row);
  }
  const showFitness = fitnessRows.some((row) => Object.keys(row).length > 1);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-semibold text-pcb-muted uppercase tracking-wider mb-2">
          Metrics comparison (selected runs)
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-pcb-border bg-pcb-surface/20 p-3">
            <p className="text-[10px] text-pcb-muted mb-2">Duration (s)</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis dataKey="name" tick={{ fill: "#8b949e", fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis tick={{ fill: "#8b949e", fontSize: 9 }} width={36} />
                <Tooltip {...TOOLTIP_PROPS} />
                <Bar dataKey="duration" fill="#58a6ff" radius={[4, 4, 0, 0]} name="Seconds" activeBar={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-xl border border-pcb-border bg-pcb-surface/20 p-3">
            <p className="text-[10px] text-pcb-muted mb-2">Total wire length</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis dataKey="name" tick={{ fill: "#8b949e", fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis tick={{ fill: "#8b949e", fontSize: 9 }} width={44} />
                <Tooltip {...TOOLTIP_PROPS} />
                <Bar dataKey="wire" fill="#3fb950" radius={[4, 4, 0, 0]} name="Wire" activeBar={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-xl border border-pcb-border bg-pcb-surface/20 p-3 md:col-span-2">
            <p className="text-[10px] text-pcb-muted mb-2">Success rate (%)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis dataKey="name" tick={{ fill: "#8b949e", fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis domain={[0, 100]} tick={{ fill: "#8b949e", fontSize: 9 }} width={36} />
                <Tooltip {...TOOLTIP_PROPS} />
                <Bar dataKey="successPct" fill="#d29922" radius={[4, 4, 0, 0]} name="Success %" activeBar={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {showFitness && (
        <div>
          <h3 className="text-xs font-semibold text-pcb-muted uppercase tracking-wider mb-2">
            Fitness / convergence by generation
          </h3>
          <div className="rounded-xl border border-pcb-border bg-pcb-surface/20 p-3">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={fitnessRows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis dataKey="gen" tick={{ fill: "#8b949e", fontSize: 9 }} label={{ value: "Generation", fill: "#8b949e", fontSize: 10, position: "insideBottom", offset: -4 }} />
                <YAxis tick={{ fill: "#8b949e", fontSize: 9 }} width={44} />
                <Tooltip
                  {...TOOLTIP_PROPS}
                  cursor={{ stroke: "#484f58", strokeWidth: 1 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {completed.map((r, i) => (
                  <Line
                    key={r.id}
                    type="monotone"
                    dataKey={`s${i}`}
                    name={shortRunLabel(r)}
                    stroke={COLORS[i % COLORS.length]}
                    dot={false}
                    strokeWidth={2}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
