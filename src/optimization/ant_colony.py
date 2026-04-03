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

    def __init__(self,
                 grid,
                 nets: Dict[str, List[Tuple[int, int]]],
                 fitness_evaluator,
                 num_ants: int = 20,
                 iterations: int = 50,
                 alpha: float = 1.0,
                 beta: float = 2.0,
                 evaporation_rate: float = 0.1,
                 pheromone_deposit: float = 1.0):

        self.grid = grid
        self.nets = nets
        self.fitness_evaluator = fitness_evaluator
        self.num_ants = num_ants
        self.iterations = iterations
        self.alpha = alpha
        self.beta = beta
        self.evaporation_rate = evaporation_rate
        self.pheromone_deposit = pheromone_deposit

        # Max-Min Ant System (MMAS) bounds to prevent stagnation
        self.tau_min = 0.01
        self.tau_max = 10.0
        self.pheromones = np.ones((grid.height, grid.width)) * 0.1

        self.best_solution: Optional[Dict[str, List[Tuple[int, int]]]] = None
        self.best_fitness: float = -float('inf')
        self.best_fitness_history: List[float] = []

    def run(self) -> Dict[str, List[Tuple[int, int]]]:
        for iteration in range(self.iterations):
            iter_best_routes = None
            iter_best_fitness = -float('inf')

            for ant_idx in range(self.num_ants):
                routes = self._build_solution()
                fitness = self.fitness_evaluator.evaluate(self.grid, routes)

                if fitness > iter_best_fitness:
                    iter_best_fitness = fitness
                    iter_best_routes = copy.deepcopy(routes)

                if fitness > self.best_fitness:
                    self.best_fitness = fitness
                    self.best_solution = copy.deepcopy(routes)

            self.best_fitness_history.append(self.best_fitness)

            # Update pheromones based ONLY on the iteration's best ant
            self._update_pheromones(iter_best_routes, iter_best_fitness)

        return self.best_solution

    def _build_solution(self) -> Dict[str, List[Tuple[int, int]]]:
        net_names = list(self.nets.keys())
        random.shuffle(net_names)

        self.grid.reset_usage()
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
                # NO FALLBACK! If the ant fails, it fails.
                # This forces the colony to learn good pheromone paths.
                routes[net_name] = []

        return routes

    def _route_net_with_pheromones(self, pins: List[Tuple[int, int]]) -> Optional[List[Tuple[int, int]]]:
        path = [pins[0]]
        remaining = list(pins[1:])

        while remaining:
            current = path[-1]
            # Pick next pin based on pheromone attraction
            next_pin = min(remaining, key=lambda p: self._pheromone_distance(current, p))

            # Route using our custom pheromone-aware A*
            segment = self._astar_with_pheromone(current, next_pin)

            if segment is None:
                return None

            path.extend(segment[1:])
            remaining.remove(next_pin)

        return path

    def _pheromone_distance(self, start: Tuple[int, int], goal: Tuple[int, int]) -> float:
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

    def _astar_with_pheromone(self, start: Tuple[int, int], goal: Tuple[int, int]) -> Optional[List[Tuple[int, int]]]:
        """Standalone A* loop that safely incorporates pheromones into the cost."""
        open_set = [(0, start)]
        came_from = {}
        g_score = {start: 0}
        visited = set()

        while open_set:
            _, current = heapq.heappop(open_set)

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

                # Dynamic Cost: Base congestion - Pheromone attraction
                cong_cost = self.grid.get_congestion_cost(nx, ny)
                pheromone_bonus = self.pheromones[ny, nx] * self.beta

                move_cost = 1.0 + 0.5 * cong_cost - pheromone_bonus
                if move_cost < 0.1:
                    move_cost = 0.1  # Prevent negative costs breaking the priority queue

                tentative_g = g_score[current] + move_cost

                if (nx, ny) not in g_score or tentative_g < g_score[(nx, ny)]:
                    g_score[(nx, ny)] = tentative_g
                    h = abs(nx - goal[0]) + abs(ny - goal[1])
                    heapq.heappush(open_set, (tentative_g + h, (nx, ny)))
                    came_from[(nx, ny)] = current

        return None

    def _update_pheromones(self, iter_best_routes: Dict, iter_best_fitness: float):
        self.pheromones *= (1 - self.evaporation_rate)

        if not iter_best_routes:
            return

        # Deposit strength based on fitness (higher is better, fitness is negative)
        deposit = abs(iter_best_fitness) / 1000 + 0.5

        for route in iter_best_routes.values():
            if route:
                for x, y in route:
                    self.pheromones[y, x] += deposit

        # Max-Min bounds to prevent complete stagnation or infinite buildup
        np.clip(self.pheromones, self.tau_min, self.tau_max, out=self.pheromones)