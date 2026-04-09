import { useRef, useEffect, useCallback, useState } from "react";
import { ZoomIn, ZoomOut, Maximize2, Grid3X3 } from "lucide-react";

const ROUTE_COLORS = [
  "#00d68f", "#ff9f43", "#58a6ff", "#f85149", "#bc8cff",
  "#39d353", "#f0883e", "#79c0ff", "#ff7b72", "#d2a8ff",
  "#56d364", "#db6d28", "#388bfd", "#ffa198", "#e2c5ff",
  "#3fb950", "#d18616", "#58a6ff", "#ff9492", "#cba6f7",
];

export default function PCBCanvas({ board, routes, usageData }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);

  const cellSize = 10 * zoom;
  const padX = 40 * zoom;
  const padY = 40 * zoom;

  const toScreen = useCallback(
    (gx, gy) => ({
      x: padX + gx * cellSize + pan.x,
      y: padY + gy * cellSize + pan.y,
    }),
    [cellSize, padX, padY, pan]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !board) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    const rect = containerRef.current.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    // Clear
    ctx.fillStyle = "#0c1117";
    ctx.fillRect(0, 0, W, H);

    const gw = board.grid_width;
    const gh = board.grid_height;
    const totalW = gw * cellSize;
    const totalH = gh * cellSize;

    // Board background
    const ox = padX + pan.x;
    const oy = padY + pan.y;
    ctx.fillStyle = "#111820";
    ctx.fillRect(ox, oy, totalW, totalH);

    // Usage heatmap
    if (usageData && usageData.length > 0 && usageData[0]) {
      const capMax = 3;
      for (let gy = 0; gy < gh && gy < usageData.length; gy++) {
        for (let gx = 0; gx < gw && gx < usageData[gy].length; gx++) {
          const u = usageData[gy][gx];
          if (u <= 0) continue;
          const ratio = Math.min(u / capMax, 1);
          const r = Math.round(255 * ratio);
          const g = Math.round(180 * (1 - ratio * 0.7));
          const b = Math.round(50 * (1 - ratio));
          ctx.fillStyle = `rgba(${r},${g},${b},0.25)`;
          ctx.fillRect(ox + gx * cellSize, oy + gy * cellSize, cellSize, cellSize);
        }
      }
    }

    // Grid lines
    if (showGrid && cellSize >= 4) {
      ctx.strokeStyle = "rgba(48,54,61,0.5)";
      ctx.lineWidth = 0.5;
      for (let gx = 0; gx <= gw; gx++) {
        const sx = ox + gx * cellSize;
        ctx.beginPath(); ctx.moveTo(sx, oy); ctx.lineTo(sx, oy + totalH); ctx.stroke();
      }
      for (let gy = 0; gy <= gh; gy++) {
        const sy = oy + gy * cellSize;
        ctx.beginPath(); ctx.moveTo(ox, sy); ctx.lineTo(ox + totalW, sy); ctx.stroke();
      }
    }

    // Board border
    ctx.strokeStyle = "#30363d";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ox, oy, totalW, totalH);

    // Components
    const comps = board.components_data || {};
    for (const [, comp] of Object.entries(comps)) {
      const { x: cx, y: cy } = toScreen(comp.x, comp.y);
      const s = cellSize * 0.9;
      ctx.fillStyle = "#1a3366";
      ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
      ctx.strokeStyle = "#4488ff";
      ctx.lineWidth = 0.8;
      ctx.strokeRect(cx - s / 2, cy - s / 2, s, s);
      if (cellSize >= 6 && comp.type) {
        ctx.fillStyle = "#8bb9ff";
        ctx.font = `${Math.max(7, cellSize * 0.5)}px "Space Grotesk"`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(comp.type, cx, cy);
      }
    }

    // Routes
    if (routes) {
      let colorIdx = 0;
      for (const [, route] of Object.entries(routes)) {
        if (!route || route.length < 2) { colorIdx++; continue; }
        const color = ROUTE_COLORS[colorIdx % ROUTE_COLORS.length];
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1.2, cellSize * 0.15);
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        const first = toScreen(route[0][0], route[0][1]);
        ctx.moveTo(first.x, first.y);
        for (let i = 1; i < route.length; i++) {
          const p = toScreen(route[i][0], route[i][1]);
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();

        // Pin dots
        ctx.globalAlpha = 1;
        const dotR = Math.max(2, cellSize * 0.2);
        for (const pt of [route[0], route[route.length - 1]]) {
          const sp = toScreen(pt[0], pt[1]);
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, dotR, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        colorIdx++;
      }
    }
  }, [board, routes, usageData, cellSize, padX, padY, pan, showGrid, toScreen]);

  useEffect(() => { draw(); }, [draw]);

  // Zoom with wheel
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      setZoom((z) => Math.max(0.3, Math.min(8, z - e.deltaY * 0.001)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Pan with drag
  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  const onPointerMove = (e) => {
    if (!dragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const onPointerUp = () => setDragging(false);

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  if (!board) {
    return (
      <div className="flex-1 flex items-center justify-center text-pcb-muted text-sm">
        Upload a board to begin
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        <button
          onClick={() => setShowGrid((s) => !s)}
          title="Toggle grid"
          className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors
            ${showGrid
              ? "bg-pcb-accent/15 border-pcb-accent/40 text-pcb-accent"
              : "bg-pcb-surface/80 border-pcb-border text-pcb-muted hover:text-pcb-text"}`}
        >
          <Grid3X3 className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setZoom((z) => Math.min(8, z * 1.25))} title="Zoom in"
          className="w-8 h-8 rounded-lg bg-pcb-surface/80 border border-pcb-border text-pcb-muted hover:text-pcb-text flex items-center justify-center transition-colors">
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setZoom((z) => Math.max(0.3, z / 1.25))} title="Zoom out"
          className="w-8 h-8 rounded-lg bg-pcb-surface/80 border border-pcb-border text-pcb-muted hover:text-pcb-text flex items-center justify-center transition-colors">
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button onClick={resetView} title="Fit to view"
          className="w-8 h-8 rounded-lg bg-pcb-surface/80 border border-pcb-border text-pcb-muted hover:text-pcb-text flex items-center justify-center transition-colors">
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <span className="ml-1 text-[10px] font-mono text-pcb-muted bg-pcb-surface/60 px-2 py-1 rounded-md border border-pcb-border">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>
    </div>
  );
}