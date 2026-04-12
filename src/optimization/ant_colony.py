import numpy as np
import random
import heapq
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
import copy

@dataclass
class Ant:
    path: List[Tuple[int, int]] = None
    length: float = 0.0

class AntColonyOptimization:
    def __init__(self, grid, nets, fitness_evaluator, num_ants=20, iterations=50, alpha=1.0,
                 beta=2.0, evaporation_rate=0.1, pheromone_deposit=1.0):
        self.grid = grid
        self.nets = nets
        self.fitness_evaluator = fitness_evaluator
        self.num_ants = num_ants
        self.iterations = iterations
        self.alpha = alpha
        self.beta = beta
        self.evaporation_rate = evaporation_rate
        self.pheromone_deposit = pheromone_deposit
        self.weights = fitness_evaluator.weights or {
            'wire_length': 1.0, 'congestion': 2.0, 'overflow': 5.0,
            'vias': 1.5, 'infeasibility': 1000.0
        }
        self.max_search_steps = (grid.width * grid.height)
        self.tau_min = 0.01
        self.tau_max = 10.0
        self.pheromones = np.ones((grid.height, grid.width)) * 0.1
        self.best_solution = None
        self.best_fitness = -float('inf')
        self.best_fitness_history: List[float] = []

    def run(self):
        for _ in range(self.iterations):
            iter_best_routes = None
            iter_best_fitness = -float('inf')
            for _ in range(self.num_ants):
                routes = self._build_solution()
                fitness = self._fast_evaluate(routes)
                if fitness > iter_best_fitness:
                    iter_best_fitness = fitness
                    iter_best_routes = copy.deepcopy(routes)
                if fitness > self.best_fitness:
                    self.best_fitness = fitness
                    self.best_solution = copy.deepcopy(routes)
            self.best_fitness_history.append(self.best_fitness)
            if self.best_solution:
                self._update_pheromones(self.best_solution)
        return self.best_solution

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

    def _build_solution(self):
        self.grid.reset_usage()
        net_names = list(self.nets.keys())
        random.shuffle(net_names)
        routes = {}
        for net_name in net_names:
            pins = self.nets.get(net_name, [])
            if len(pins) < 2:
                routes[net_name] = pins
                continue
            path = self._route_net_with_pheromones(pins)
            if path:
                routes[net_name] = path
                self.grid.update_usage(path, delta=1)
            else:
                routes[net_name] = []
                for r in routes.values():
                    if r:
                        self.grid.update_usage(r, delta=-1)
                return routes
        return routes

    def _route_net_with_pheromones(self, pins):
        path = [pins[0]]
        remaining = list(pins[1:])
        while remaining:
            current = path[-1]
            next_pin = min(remaining, key=lambda p: self._pheromone_distance(current, p))
            segment = self._astar_pheromone(current, next_pin)
            if segment is None:
                return None
            path.extend(segment[1:])
            remaining.remove(next_pin)
        return path

    def _pheromone_distance(self, start, goal):
        manhattan = abs(start[0] - goal[0]) + abs(start[1] - goal[1])
        steps = max(abs(goal[0] - start[0]), abs(goal[1] - start[1]), 1)
        total_pheromone = 0
        for t in range(steps + 1):
            x = int(start[0] + t * (goal[0] - start[0]) / steps)
            y = int(start[1] + t * (goal[1] - start[1]) / steps)
            if 0 <= x < self.grid.width and 0 <= y < self.grid.height:
                total_pheromone += self.pheromones[y, x]
        avg_pheromone = total_pheromone / (steps + 1)
        return manhattan / (1 + avg_pheromone)

    def _astar_pheromone(self, start, goal):
        oset = [(0.0, start)]
        came_from = {}
        gscore = {start: 0.0}
        visited = set()
        steps_taken = 0
        while oset:
            steps_taken += 1
            if steps_taken > self.max_search_steps:
                return None
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
                base_cost = 1.0 + 0.5 * self.grid.get_congestion_cost(nx, ny)
                ph = self.pheromones[ny, nx]
                noise_strength = max(0.0, 1.0 - ph)
                noise = random.uniform(-noise_strength, noise_strength) * 0.5
                move_cost = max(0.1, base_cost + noise)
                tg = gscore[current] + move_cost
                if (nx, ny) not in gscore or tg < gscore[(nx, ny)]:
                    gscore[(nx, ny)] = tg
                    h = abs(nx - goal[0]) + abs(ny - goal[1])
                    heapq.heappush(oset, (tg + h, (nx, ny)))
                    came_from[(nx, ny)] = current
        return None

    def _update_pheromones(self, best_routes):
        self.pheromones *= (1 - self.evaporation_rate)
        if not best_routes:
            return
        for route in best_routes.values():
            if route:
                for x, y in route:
                    self.pheromones[y, x] += 1.0
        np.clip(self.pheromones, self.tau_min, self.tau_max, out=self.pheromones)