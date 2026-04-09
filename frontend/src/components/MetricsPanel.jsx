import { Activity, Ruler, AlertTriangle, CheckCircle, Zap } from "lucide-react";

const CARD_STYLES = {
  good:    "border-pcb-accent/30 bg-pcb-accent/5",
  warn:    "border-pcb-copper/30 bg-pcb-copper/5",
  danger:  "border-pcb-danger/30 bg-pcb-danger/5",
  neutral: "border-pcb-border bg-pcb-surface/40",
};

function pickStyle(label, value) {
  if (label.includes("overflow") && value > 0) return "danger";
  if (label.includes("success") && value >= 0.9) return "good";
  if (label.includes("success") && value < 0.5) return "danger";
  if (label.includes("congestion") && value > 2) return "warn";
  return "neutral";
}

function MetricCard({ label, value, icon: Icon, format = "number" }) {
  const style = pickStyle(label, value);
  const display = format === "pct"
    ? `${(value * 100).toFixed(1)}%`
    : format === "time"
      ? `${value.toFixed(2)}s`
      : typeof value === "number"
        ? value.toLocaleString()
        : String(value ?? "—");

  return (
    <div className={`rounded-lg border p-3 transition-colors ${CARD_STYLES[style]}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-pcb-muted" />
        <span className="text-[10px] font-semibold text-pcb-muted uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-lg font-bold font-mono text-pcb-text">{display}</p>
    </div>
  );
}

export default function MetricsPanel({ metrics, duration }) {
  if (!metrics) {
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-pcb-muted uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" /> Metrics
        </h3>
        <p className="text-xs text-pcb-muted italic py-6 text-center">
          Run an optimization to see metrics
        </p>
      </div>
    );
  }

  const cards = [
    { label: "Wire Length",   value: metrics.total_wire_length,   icon: Ruler,       format: "number" },
    { label: "Max Congestion",value: metrics.max_congestion,       icon: Zap,          format: "number" },
    { label: "Total Overflow",value: metrics.total_overflow,       icon: AlertTriangle,format: "number" },
    { label: "Success Rate",  value: metrics.success_rate,         icon: CheckCircle,  format: "pct" },
    { label: "Routed Nets",   value: `${metrics.routed_nets} / ${metrics.total_nets}`, icon: Activity, format: "text" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-pcb-muted uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" /> Metrics
        </h3>
        {duration != null && (
          <span className="text-[10px] font-mono text-pcb-accent bg-pcb-accent/10 px-2 py-0.5 rounded-md">
            {duration.toFixed(2)}s
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {cards.map((c) => (
          <MetricCard key={c.label} {...c} />
        ))}
      </div>
    </div>
  );
}