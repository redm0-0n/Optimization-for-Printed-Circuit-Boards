import { useEffect, useMemo, useState } from "react";
import { BookOpen, Cpu, Layers, Sparkles } from "lucide-react";
import { api } from "../api/client";
import RuntimeScatterChart from "../components/RuntimeScatterChart";

export default function HomePage() {
  const [health, setHealth] = useState({ ok: null, detail: null });
  const [runs, setRuns] = useState([]);
  const [boards, setBoards] = useState([]);
  const [runsLoaded, setRunsLoaded] = useState(false);

  useEffect(() => {
    api.health()
      .then(() => setHealth({ ok: true, detail: null }))
      .catch((e) => setHealth({ ok: false, detail: e.message }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [runList, boardList] = await Promise.all([
          api.listRuns(),
          api.listBoards(),
        ]);
        if (!cancelled) {
          setRuns(runList);
          setBoards(boardList);
        }
      } catch {
        if (!cancelled) {
          setRuns([]);
          setBoards([]);
        }
      } finally {
        if (!cancelled) setRunsLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const boardById = useMemo(() => {
    const m = new Map();
    for (const b of boards) {
      m.set(String(b.id), b);
    }
    return m;
  }, [boards]);

  const navClass =
    "text-xs font-medium text-pcb-accent hover:text-pcb-text underline-offset-2 hover:underline";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-8 py-10 space-y-10">
        <nav className="flex flex-wrap gap-x-4 gap-y-2 pb-4 border-b border-pcb-border">
          <a href="#intro" className={navClass}>Introduction</a>
          <a href="#comparison" className={navClass}>Comparing runs</a>
          <a href="#results" className={navClass}>Empirical results</a>
          <a href="#workflow" className={navClass}>Workflow</a>
          <a href="#algorithms" className={navClass}>Algorithms</a>
        </nav>

        <div id="intro">
          <p className="text-[10px] font-semibold text-pcb-muted uppercase tracking-widest mb-2">
            Project
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-pcb-text">
            PCB routing optimization
          </h2>
          <p className="mt-3 text-sm text-pcb-muted leading-relaxed">
            This workspace is for experimenting with printed circuit board net routing:
            upload a board definition, run baseline A*, a genetic algorithm, or ant colony
            optimization, then inspect routes, convergence, and quality metrics.
          </p>
        </div>

        <div
          className={`rounded-xl border px-4 py-3 flex items-center gap-3 text-xs ${
            health.ok === true
              ? "border-pcb-accent/30 bg-pcb-accent/5 text-pcb-accent"
              : health.ok === false
                ? "border-pcb-danger/30 bg-pcb-danger/5 text-pcb-danger"
                : "border-pcb-border bg-pcb-surface/40 text-pcb-muted"
          }`}
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <div>
            <span className="font-semibold">API</span>
            {health.ok === null && <span className="ml-2">Checking…</span>}
            {health.ok === true && <span className="ml-2">Backend reachable</span>}
            {health.ok === false && (
              <span className="ml-2 font-mono">{health.detail || "Unavailable"}</span>
            )}
          </div>
        </div>

        <section id="comparison" className="scroll-mt-24 space-y-4 rounded-xl border border-pcb-border bg-pcb-surface/20 p-6">
          <h3 className="text-sm font-bold text-pcb-text tracking-tight">
            Comparing runs
          </h3>
          <div className="text-sm text-pcb-muted leading-relaxed space-y-3">
            <p>
              Use the <span className="text-pcb-text font-medium">Statistics</span> page to inspect past
              runs, full GA and ACO parameter sets, and per-run metrics in a detail dialog. Select
              two or more <span className="text-pcb-text font-medium">completed</span> runs with the
              checkboxes, then press <span className="text-pcb-text font-medium">Compare</span>: a
              <span className="text-pcb-text font-medium"> new browser window</span> opens with bar
              charts (time, wire length, success), optional fitness curves when histories exist, and
              the server-side comparison table when algorithms differ.
            </p>
            <p>
              Charts in that window use a dark theme so hover highlights stay readable; the same
              detail view is available from <span className="text-pcb-text font-medium">Analysis</span>{" "}
              when you open the full report for the active result or a history entry.
            </p>
          </div>
        </section>

        <section id="results" className="scroll-mt-24 space-y-4">
          <h3 className="text-sm font-bold text-pcb-text tracking-tight">
            Empirical results
          </h3>
          <p className="text-sm text-pcb-muted leading-relaxed">
            Run time vs instance size (grid cells × net count). Larger boards and more nets increase
            search space; completed runs from your workspace are plotted below once the API returns data.
          </p>
          {!runsLoaded ? (
            <p className="text-xs text-pcb-muted italic py-8 text-center">Loading chart data…</p>
          ) : (
            <RuntimeScatterChart runs={runs} boardById={boardById} />
          )}
        </section>

        <section id="workflow" className="scroll-mt-24 space-y-4">
          <h3 className="text-xs font-semibold text-pcb-muted uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-3.5 h-3.5" />
            Workflow
          </h3>
          <ol className="list-decimal list-inside text-sm text-pcb-muted space-y-2 leading-relaxed">
            <li>Open <span className="text-pcb-text font-medium">Analysis</span> from the sidebar.</li>
            <li>Upload or select a board, choose an algorithm and parameters, then start a run.</li>
            <li>Watch the canvas and convergence chart; completed runs appear in history.</li>
            <li>Use <span className="text-pcb-text font-medium">Statistics</span> to compare runs; use Compare to open charts in a new window.</li>
          </ol>
        </section>

        <section id="algorithms" className="scroll-mt-24 space-y-4">
          <h3 className="text-xs font-semibold text-pcb-muted uppercase tracking-wider flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5" />
            Algorithms (overview)
          </h3>
          <ul className="space-y-3 text-sm text-pcb-muted">
            <li>
              <span className="text-pcb-info font-medium">Baseline</span> — fast greedy A* with
              rip-up-and-reroute; useful as a reference point.
            </li>
            <li>
              <span className="text-pcb-accent font-medium">GA</span> — evolutionary search over net
              ordering and route mutations; tune population, generations, and genetic operators.
            </li>
            <li>
              <span className="text-pcb-copper font-medium">ACO</span> — pheromone-guided iterative
              routing; exposes colony size, evaporation, and heuristic weights.
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-pcb-border bg-pcb-surface/30 p-5 flex gap-3">
          <BookOpen className="w-5 h-5 text-pcb-muted shrink-0 mt-0.5" />
          <div className="text-xs text-pcb-muted leading-relaxed">
            Extend this page with links to documentation, dataset descriptions, or publication
            notes when your project materials are ready.
          </div>
        </section>
      </div>
    </div>
  );
}
