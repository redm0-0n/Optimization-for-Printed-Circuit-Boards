import { useEffect, useMemo, useState } from "react";
import { Sparkles, Lightbulb, GitMerge, Bug, BarChart3 } from "lucide-react";
import { api } from "../api/client";
import RuntimeScatterChart from "../components/RuntimeScatterChart";
import ACOParameterChart from "../components/ACOParameterChart";
import GAParameterChart from "../components/GAParameterChart";
import QualityScatterChart from "../components/QualityScatterChart"

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
          <a href="#results" className={navClass}>Empirical results</a>
          <a href="#aco-impact" className={navClass}>ACO Analysis</a>
          <a href="#ga-impact" className={navClass}>GA Analysis</a>
          <a href="#conclusion" className={navClass}>Conclusion</a>
        </nav>

        <div id="intro">
          <p className="text-[10px] font-semibold text-pcb-muted uppercase tracking-widest mb-2">
            Project Overview
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-pcb-text">
            PCB Routing Optimizer
          </h2>
          <p className="mt-3 text-sm text-pcb-muted leading-relaxed">
            A comprehensive research environment for printed circuit board routing. 
            Compare A* Baseline, Genetic Algorithms, and Ant Colony Optimization 
            through interactive visualization and parameter sensitivity analysis.
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
            <span className="font-semibold">System Status:</span>
            {health.ok === null && <span className="ml-2">Connecting to solver...</span>}
            {health.ok === true && <span className="ml-2">Backend solver is online</span>}
            {health.ok === false && (
              <span className="ml-2 font-mono">{health.detail || "Connection failed"}</span>
            )}
          </div>
        </div>

        {/* Empirical Results (Complexity Chart) */}
        <section id="results" className="scroll-mt-24 space-y-4">
          <h3 className="text-sm font-bold text-pcb-text tracking-tight flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Runtime Complexity
          </h3>
          <p className="text-sm text-pcb-muted leading-relaxed">
          Visualization of solver time and routing quality relative to problem size (grid cells × nets). 
          Higher complexity instances naturally demand more computational time. 
          The Penalty Score chart evaluates routing success based on a weighted cost function, 
          where a lower score indicates a better physical layout. 
          You can interactively adjust the significance of key parameters—Wire Length (signal delay), 
          Congestion (crosstalk risk), Overflow (manufacturing shorts), 
          and Fail Penalty (unrouted nets)—to observe how different optimization 
          priorities highlight the strengths of baseline and metaheuristic algorithms.
          </p>
          {!runsLoaded ? (
            <p className="text-xs text-pcb-muted italic py-8 text-center">Loading complexity data…</p>
          ) : (
            <div className="space-y-5">
                <RuntimeScatterChart runs={runs} boardById={boardById} />
                
                <QualityScatterChart runs={runs} boardById={boardById} />
            </div>
          )}
        </section>

        {/* ACO Impact */}
        <section id="aco-impact" className="scroll-mt-24 space-y-4">
          <h3 className="text-sm font-bold text-pcb-text tracking-tight flex items-center gap-2">
            <Bug className="w-4 h-4 text-pcb-copper" />
            Impact of ACO Parameters
          </h3>
          <p className="text-sm text-pcb-muted leading-relaxed">
            Analysis of how pheromone importance (Alpha) and heuristic desirability (Beta) influence 
            the colony's ability to find the shortest wire length without overlaps. The point size depends on the running time of the algorithm.
          </p>
          {!runsLoaded ? (
            <p className="text-xs text-pcb-muted italic py-8 text-center">Loading ACO analysis…</p>
          ) : (
            <ACOParameterChart runs={runs} />
          )}
        </section>

        {/* GA Impact */}
        <section id="ga-impact" className="scroll-mt-24 space-y-4">
          <h3 className="text-sm font-bold text-pcb-text tracking-tight flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-pcb-accent" />
            Impact of GA Parameters
          </h3>
          <p className="text-sm text-pcb-muted leading-relaxed">
            Evaluating the trade-off between exploration (Mutation Rate) and exploitation 
            (Crossover Rate) in the population-based evolutionary search. The point size depends on the running time of the algorithm.
          </p>
          {!runsLoaded ? (
            <p className="text-xs text-pcb-muted italic py-8 text-center">Loading GA analysis…</p>
          ) : (
            <GAParameterChart runs={runs} />
          )}
        </section>

        {/* CONCLUSION SECTION */}
        <section id="conclusion" className="scroll-mt-24 space-y-6 pt-6 border-t border-pcb-border">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-pcb-text tracking-tight flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-pcb-copper" />
              Theoretical Conclusion & Parameter Analysis
            </h3>
            
            <div className="bg-pcb-surface/30 rounded-xl border border-pcb-border p-5 space-y-6">
              {/* General Findings */}
              <div className="text-sm text-pcb-muted leading-relaxed space-y-3">
                <p>
                  Our experiments show that while the <span className="text-pcb-text font-medium">A* Baseline</span> is effective for simple designs, 
                  it fails in high-density scenarios due to its greedy nature. Metaheuristic approaches (GA & ACO) 
                  demonstrate superior adaptability by iteratively resolving net conflicts.
                </p>
              </div>

              {/* Parameter Sensitivity Analysis */}
              <div className="grid gap-6">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-pcb-copper uppercase tracking-wider">ACO Parameter Sensitivity</h4>
                  <ul className="text-xs text-pcb-muted space-y-2 list-none">
                    <li>
                      <span className="text-pcb-text font-medium">Alpha (Pheromone):</span> High values lead to rapid exploitation. The colony follows existing paths too strictly, often getting stuck in local optima. Moderate values (1.0-1.5) are best for balancing history and new discovery.
                    </li>
                    <li>
                      <span className="text-pcb-text font-medium">Beta (Heuristic):</span> This is the "vision" of the ants. Increasing Beta helps ants find the shortest paths quickly but can lead to "selfish" routing that blocks other nets.
                    </li>
                    <li>
                      <span className="text-pcb-text font-medium">Evaporation:</span> Crucial for "forgetting" bad routes. Low evaporation preserves stale information, while very high evaporation (0.2+) might prevent the colony from forming stable optimal paths.
                    </li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-pcb-accent uppercase tracking-wider">GA Parameter Sensitivity</h4>
                  <ul className="text-xs text-pcb-muted space-y-2 list-none">
                    <li>
                      <span className="text-pcb-text font-medium">Mutation Rate:</span> The primary tool for diversity. On complex boards, a higher mutation (0.15+) is required to "jump" over severe routing obstacles that would otherwise stall the evolution.
                    </li>
                    <li>
                      <span className="text-pcb-text font-medium">Crossover Rate:</span> High crossover (0.8-0.9) ensures that successful routing segments from different individuals are combined, speeding up the discovery of full valid solutions.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-4 border-t border-pcb-border/40">
                <p className="text-xs text-pcb-muted italic leading-relaxed">
                  <span className="text-pcb-text font-bold">Final Verdict:</span> For dense PCB layouts, the most robust results are achieved using <span className="text-pcb-copper">ACO</span> with a high 
                  heuristic weight (<span className="font-mono">Beta &gt; Alpha</span>) or <span className="text-pcb-accent">GA</span> with a 
                  significant <span className="font-mono">Mutation Rate</span> to maintain population health throughout hundreds of generations.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}