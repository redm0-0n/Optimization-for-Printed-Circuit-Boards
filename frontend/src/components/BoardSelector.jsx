import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Layers } from "lucide-react";

export default function BoardSelector({ boards, selectedId, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef(null);

  const selectedBoard = boards.find(b => String(b.id) === String(selectedId));
  const filtered = boards.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="text-[10px] font-semibold text-pcb-muted uppercase tracking-wider mb-1.5 block">
        Selected Board
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-pcb-border bg-pcb-surface/50 hover:border-pcb-muted/50 transition-all text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Layers className="w-4 h-4 text-pcb-accent shrink-0" />
          <span className="text-xs text-pcb-text truncate">
            {selectedBoard ? selectedBoard.name : "Select a board..."}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-pcb-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 z-[100] bg-pcb-surface border border-pcb-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
          <div className="p-2 border-b border-pcb-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-pcb-muted" />
              <input
                autoFocus
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-pcb-bg border border-pcb-border rounded-md pl-8 pr-3 py-1.5 text-xs outline-none focus:border-pcb-accent/50"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.map(b => (
              <button
                key={b.id}
                onClick={() => { onChange(b.id); setIsOpen(false); }}
                className={`w-full text-left px-3 py-2.5 hover:bg-pcb-accent/5 flex items-center justify-between group transition-colors
                  ${String(selectedId) === String(b.id) ? "bg-pcb-accent/10" : ""}`}
              >
                <div>
                  <div className="text-xs text-pcb-text font-medium group-hover:text-pcb-accent">{b.name}</div>
                  <div className="text-[9px] text-pcb-muted font-mono">{b.grid_width}x{b.grid_height} • {b.nets_count} nets</div>
                </div>
                {String(selectedId) === String(b.id) && (
                  <div className="w-1.5 h-1.5 rounded-full bg-pcb-accent" />
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="p-4 text-center text-[10px] text-pcb-muted italic">No boards found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}