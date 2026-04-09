import { Cpu, BarChart3, Upload, History } from "lucide-react";

const items = [
  { id: "dashboard", icon: BarChart3, label: "Dashboard" },
  { id: "optimize",  icon: Upload,    label: "Optimize" },
  { id: "history",   icon: History,   label: "History" },
];

export default function Sidebar({ active, onChange }) {
  return (
    <aside className="w-16 bg-pcb-surface border-r border-pcb-border flex flex-col items-center py-6 gap-2 fixed left-0 top-0 h-full z-50">
      {/* Logo */}
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pcb-accent/30 to-pcb-copper/20 flex items-center justify-center mb-8">
        <Cpu className="w-5 h-5 text-pcb-accent" />
      </div>

      {items.map((it) => {
        const Icon = it.icon;
        const isActive = active === it.id;
        return (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            title={it.label}
            className={`w-11 h-11 rounded-xl flex items-center justify-center
              transition-all duration-200 group relative
              ${isActive
                ? "bg-pcb-accent/15 text-pcb-accent shadow-lg shadow-pcb-accent/5"
                : "text-pcb-muted hover:text-pcb-text hover:bg-pcb-border/40"}`}
          >
            <Icon className="w-5 h-5" />
            {/* Tooltip */}
            <span className="absolute left-full ml-3 px-2.5 py-1 rounded-lg
              bg-pcb-surface border border-pcb-border text-xs text-pcb-text
              opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
              whitespace-nowrap shadow-xl">
              {it.label}
            </span>
          </button>
        );
      })}

      {/* Bottom spacer */}
      <div className="flex-1" />
      <div className="w-8 h-px bg-pcb-border" />
    </aside>
  );
}