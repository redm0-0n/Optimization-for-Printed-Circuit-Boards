import numpy as np
import random
import heapq
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field
import copy

@dataclass
class Individual:
    routes: Dict[str, List[Tuple[int, int]]]
    fitness: float = 0.0
    net_order: List[str] = field(default_factory=list)

class GeneticAlgorithm:
    def __init__(self, grid, nets, fitness_evaluator, population_size=50, generations=100,
                 mutation_rate=0.2, crossover_rate=0.8, elite_size=2):
        self.grid = grid
        self.nets = nets
        self.fitness_evaluator = fitness_evaluator
        self.population_size = population_size
        self.generations = generations
        self.mutation_rate = mutation_rate
        self.crossover_rate = crossover_rate
        self.elite_size = elite_size
        self.weights = fitness_evaluator.weights or {
            'wire_length': 1.0, 'congestion': 2.0, 'overflow': 5.0,
            'vias': 1.5, 'infeasibility': 1000.0
        }
        self.population: List[List[str]] = []
        self.best_individual: Optional[Individual] = None
        self.best_fitness_history: List[float] = []
        self.current_gen = 0

    def _fast_evaluate(self, routes):
        wl = 0
        vias = 0
        failed = 0
        for route in routes.values():
            if not route:
                failed += 1
                continue
            pdx = pdy = 0
            for i, (x, y) in enumerate(route):
                if i > 0:
                    dx = x - route[i-1][0]
                    dy = y - route[i-1][1]
                    wl += abs(dx) + abs(dy)
                    if i > 1 and (dx, dy) != (pdx, pdy):
                        vias += 1
                    pdx, pdy = dx, dy
        ur = self.grid.usage / self.grid.capacity
        cg = float(np.mean(ur))
        of_ = float(np.sum(np.maximum(0, self.grid.usage - self.grid.capacity)))
        cost = (self.weights['wire_length'] * wl / 1000 + self.weights['congestion'] * cg +
                self.weights['overflow'] * of_ + self.weights['vias'] * vias +
                self.weights['infeasibility'] * failed)
        return -cost

    def _astar_stochastic(self, start, goal, temp=1.0):
        oset = [(0.0, start)]
        came_from = {}
        gscore = {start: 0.0}
        visited = set()
        while oset:
            _, current = heapq.heappop(oset)
            if current in visited:
                continue
            visited.add(current)
            if current == goal:
                path = [current]
                while current in came_from:
                    current = came_from[current]
                    path.append(current)
                return path[::-1]
            for nx, ny in self.grid.get_neighbors(current[0], current[1]):
                if (nx, ny) in visited:
                    continue
                base = 1.0 + 0.5 * self.grid.get_congestion_cost(nx, ny)
                noise = random.uniform(-0.2 * temp, 0.2 * temp)
                move_cost = max(0.1, base + noise)
                tg = gscore[current] + move_cost
                if (nx, ny) not in gscore or tg < gscore[(nx, ny)]:
                    gscore[(nx, ny)] = tg
                    h = abs(nx - goal[0]) + abs(ny - goal[1])
                    heapq.heappush(oset, (tg + h, (nx, ny)))
                    came_from[(nx, ny)] = current
        return None

    def _evaluate_individual(self, net_order):
        self.grid.reset_usage()
        routes = {}
        gen_temp = 1.0 + 2.0 * (1.0 - self.current_gen / max(self.generations - 1, 1))
        for i, net_name in enumerate(net_order):
            pins = self.nets.get(net_name, [])
            if len(pins) < 2:
                routes[net_name] = pins
                continue
            if len(pins) == 2:
                path = self._astar_stochastic(pins[0], pins[1], gen_temp)
                if path:
                    routes[net_name] = path
                    self.grid.update_usage(path, delta=1)
                else:
                    routes[net_name] = []
            else:
                path = [pins[0]]
                remaining = list(pins[1:])
                success = True
                while remaining:
                    next_p = min(remaining, key=lambda p: abs(p[0] - path[-1][0]) + abs(p[1] - path[-1][1]))
                    seg = self._astar_stochastic(path[-1], next_p, gen_temp)
                    if seg:
                        path.extend(seg[1:])
                        remaining.remove(next_p)
                    else:
                        success = False
                        break
                if success:
                    routes[net_name] = path
                    self.grid.update_usage(path, delta=1)
                else:
                    routes[net_name] = []
        return self._fast_evaluate(routes), routes

    def _initialize_population(self):
        net_names = list(self.nets.keys())
        for _ in range(self.population_size):
            order = net_names.copy()
            random.shuffle(order)
            self.population.append(order)

    def _tournament_selection(self, fitnesses, tournament_size=3):
        indices = random.sample(range(len(self.population)), tournament_size)
        best_idx = max(indices, key=lambda i: fitnesses[i])
        return self.population[best_idx]

    def _order_crossover(self, p1, p2):
        size = len(p1)
        if size <= 2:
            return p1.copy()
        start, end = sorted(random.sample(range(size), 2))
        child = [None] * size
        child[start:end + 1] = p1[start:end + 1]
        ptr = 0
        for item in p2:
            if item not in child:
                while child[ptr] is not None:
                    ptr += 1
                child[ptr] = item
        return child

    def _mutate_order(self, order):
        idx1, idx2 = random.sample(range(len(order)), 2)
        order[idx1], order[idx2] = order[idx2], order[idx1]
        return order

    def run(self):
        self._initialize_population()
        best_routes = None
        best_fitness = -float('inf')
        self.current_gen = 0
        for gen in range(self.generations):
            self.current_gen = gen
            fitnesses = []
            for i, order in enumerate(self.population):
                fit, routes = self._evaluate_individual(order)
                fitnesses.append(fit)
                if fit > best_fitness:
                    best_fitness = fit
                    best_routes = routes
            self.best_fitness_history.append(best_fitness)
            next_population = []
            sorted_indices = sorted(range(len(fitnesses)), key=lambda i: fitnesses[i], reverse=True)
            for e in range(self.elite_size):
                next_population.append(list(self.population[sorted_indices[e]]))
            while len(next_population) < self.population_size:
                p1 = self._tournament_selection(fitnesses)
                p2 = self._tournament_selection(fitnesses)
                if random.random() < self.crossover_rate:
                    child = self._order_crossover(p1, p2)
                else:
                    child = p1.copy()
                if random.random() < self.mutation_rate:
                    child = self._mutate_order(child)
                next_population.append(child)
            self.population = next_population
        return Individual(routes=best_routes, fitness=best_fitness)