import { useState, useRef } from "react";
import { Upload, CheckCircle, X } from "lucide-react";
import { api } from "../api/client";

export default function FileUpload({ onUploaded }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const inputRef = useRef(null);

  const handle = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith(".def")) {
      setError("Only .def files are accepted");
      return;
    }
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const board = await api.uploadBoard(file);
      setSuccess(
        `"${board.name}" — ${board.components_count} components, ${board.nets_count} nets, ${board.grid_width}×${board.grid_height} grid`
      );
      if (onUploaded) onUploaded(board);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handle(file);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center
          justify-center cursor-pointer transition-all duration-300 min-h-[180px]
          ${dragging
            ? "border-pcb-accent bg-pcb-accent/5 scale-[1.01]"
            : "border-pcb-border hover:border-pcb-muted bg-pcb-surface/40"}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".def"
          className="hidden"
          onChange={(e) => { if (e.target.files[0]) handle(e.target.files[0]); e.target.value = ""; }}
        />

        {uploading ? (
          <div className="animate-spin-slow w-10 h-10 border-2 border-pcb-accent border-t-transparent rounded-full mb-3" />
        ) : (
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors
            ${dragging ? "bg-pcb-accent/20" : "bg-pcb-border/50"}`}>
            <Upload className={`w-5 h-5 ${dragging ? "text-pcb-accent" : "text-pcb-muted"}`} />
          </div>
        )}

        <p className="text-sm font-medium text-pcb-text mb-1">
          {uploading ? "Parsing DEF file…" : "Drop .def file here or click to browse"}
        </p>
        <p className="text-xs text-pcb-muted">Supports standard DEF format</p>
      </div>

      {/* Success toast */}
      {success && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-pcb-accent/10 border border-pcb-accent/20 fade-in-up">
          <CheckCircle className="w-4 h-4 text-pcb-accent mt-0.5 shrink-0" />
          <p className="text-xs text-pcb-accent leading-relaxed break-all">{success}</p>
          <button onClick={() => setSuccess(null)} className="shrink-0 ml-auto">
            <X className="w-3.5 h-3.5 text-pcb-accent/60 hover:text-pcb-accent" />
          </button>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-pcb-danger/10 border border-pcb-danger/20 fade-in-up">
          <X className="w-4 h-4 text-pcb-danger mt-0.5 shrink-0" />
          <p className="text-xs text-pcb-danger">{error}</p>
          <button onClick={() => setError(null)} className="shrink-0 ml-auto">
            <X className="w-3.5 h-3.5 text-pcb-danger/60 hover:text-pcb-danger" />
          </button>
        </div>
      )}
    </div>
  );
}