import { Layers, Trash2, Database, Search } from "lucide-react";
import FileUpload from "../components/FileUpload";
import { useState } from "react";

export default function BoardsLibraryView({ boards, onUploaded, onDeleteBoard }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredBoards = boards.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto bg-pcb-bg p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-pcb-text flex items-center gap-3">
            <Database className="w-6 h-6 text-pcb-accent" />
            Boards Library
          </h2>
          <p className="text-sm text-pcb-muted mt-2">
            Upload and manage your PCB definitions (.def). These boards will be available across all analysis tools.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-pcb-muted uppercase tracking-widest">Upload New Board</h3>
            <FileUpload onUploaded={onUploaded} />
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-pcb-muted uppercase tracking-widest">
                Stored Boards ({boards.length})
              </h3>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-pcb-muted" />
                <input 
                  type="text"
                  placeholder="Search boards..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-pcb-surface border border-pcb-border rounded-lg pl-9 pr-4 py-1.5 text-xs outline-none focus:border-pcb-accent/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredBoards.map((b) => (
                <div 
                  key={b.id}
                  className="p-4 rounded-xl border border-pcb-border bg-pcb-surface/40 hover:border-pcb-muted/50 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-pcb-accent/10 flex items-center justify-center">
                        <Layers className="w-5 h-5 text-pcb-accent" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-pcb-text truncate max-w-[150px]">{b.name}</h4>
                        <p className="text-[10px] text-pcb-muted font-mono uppercase">
                          {b.grid_width}x{b.grid_height} • {b.nets_count} nets
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onDeleteBoard(b.id)}
                      className="p-2 text-pcb-muted hover:text-pcb-danger hover:bg-pcb-danger/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {filteredBoards.length === 0 && (
                <div className="col-span-full py-20 text-center border border-dashed border-pcb-border rounded-xl">
                  <p className="text-xs text-pcb-muted italic">No boards found matching your search.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}