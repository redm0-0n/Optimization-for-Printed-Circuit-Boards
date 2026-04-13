/** Tunable algorithm fields: defaults used when API stores {} for omitted params. */
export const PRESETS = {
  baseline: {},
  ga: {
    population_size: { label: "Population Size", type: "number", default: 50, min: 10, max: 500 },
    generations: { label: "Generations", type: "number", default: 100, min: 10, max: 1000 },
    mutation_rate: { label: "Mutation Rate", type: "number", default: 0.1, min: 0, max: 1, step: 0.01 },
    crossover_rate: { label: "Crossover Rate", type: "number", default: 0.8, min: 0, max: 1, step: 0.01 },
  },
  aco: {
    num_ants: { label: "Ants per Iteration", type: "number", default: 50, min: 5, max: 200 },
    iterations: { label: "Iterations", type: "number", default: 100, min: 10, max: 500 },
    alpha: { label: "Alpha (Pheromone)", type: "number", default: 1.0, min: 0, max: 5, step: 0.1 },
    beta: { label: "Beta (Heuristic)", type: "number", default: 2.0, min: 0, max: 5, step: 0.1 },
    evaporation_rate: { label: "Evaporation Rate", type: "number", default: 0.1, min: 0, max: 1, step: 0.01 },
  },
};

export const ALGO_LABELS = {
  baseline: "A* Baseline",
  ga: "Genetic Algorithm",
  aco: "Ant Colony Optimization",
};

export const ALGO_DESC = {
  baseline: "Greedy A* with rip-up-and-reroute. Fast baseline for comparison.",
  ga: "Evolutionary search over net ordering and route mutations.",
  aco: "Pheromone-guided A* routing with iterative reinforcement.",
};

/** Merge stored parameters with schema defaults so tables/modals always show full GA/ACO sets. */
export function resolveAlgorithmParameters(algorithm, parameters) {
  const fields = PRESETS[algorithm];
  if (!fields || Object.keys(fields).length === 0) return { ...(parameters || {}) };
  const raw = parameters || {};
  const out = {};
  for (const key of Object.keys(fields)) {
    out[key] = raw[key] != null ? raw[key] : fields[key].default;
  }
  return out;
}

export function parametersToDisplayRows(algorithm, parameters) {
  const fields = PRESETS[algorithm];
  const resolved = resolveAlgorithmParameters(algorithm, parameters);
  if (!fields || Object.keys(fields).length === 0) {
    return Object.keys(resolved).length
      ? Object.entries(resolved).map(([key, value]) => ({ key, label: key, value }))
      : [];
  }
  return Object.keys(fields).map((key) => ({
    key,
    label: fields[key].label,
    value: resolved[key],
  }));
}
