import numpy as np
import random
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass


@dataclass
class Ant:
    path: List[Tuple[int, int]] = None
    length: float = 0.0


class AntColonyOptimization:

    def __init__(self,
                 grid,
                 nets: Dict[str, List[Tuple[int, int]]],
                 fitness_evaluator,
                 num_ants: int = 50,
                 iterations: int = 100,
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

        self.pheromones = np.ones((grid.height, grid.width)) * 0.1

        self.best_solution: Optional[Dict[str, List[Tuple[int, int]]]] = None
        self.best_fitness: float = -float('inf')
        self.best_fitness_history: List[float] = []

    def run(self) -> Dict[str, List[Tuple[int, int]]]:

        for iteration in range(self.iterations):
            solutions = []

            for ant_idx in range(self.num_ants):
                solution = self._build_solution()
                solutions.append(solution)

            for solution in solutions:
                fitness = self.fitness_evaluator.evaluate(self.grid, solution)

                if fitness > self.best_fitness:
                    self.best_fitness = fitness
                    self.best_solution = solution.copy()

            self.best_fitness_history.append(self.best_fitness)

            # Update pheromones
            self._update_pheromones(solutions)

        return self.best_solution

    def _build_solution(self) -> Dict[str, List[Tuple[int, int]]]:
        from src.baselines.astar_routing import AStarRouter

        net_names = list(self.nets.keys())
        random.shuffle(net_names)

        self.grid.reset_usage()
        router = AStarRouter(self.grid)

        routes = {}

        for net_name in net_names:
            pins = self.nets[net_name]

            if len(pins) == 1:
                routes[net_name] = [pins[0]]
                continue

            path = self._pheromone_guided_routing(pins, router)

            if path:
                routes[net_name] = path
                self.grid.update_usage(path, delta=1)
            else:
                path = router.route_net(pins)
                if path:
                    routes[net_name] = path
                    self.grid.update_usage(path, delta=1)
                else:
                    routes[net_name] = []

        return routes

    def _pheromone_guided_routing(self, pins: List[Tuple[int, int]], router) -> Optional[List[Tuple[int, int]]]:
        if len(pins) <= 1:
            return pins

        path = [pins[0]]
        remaining = pins[1:]

        while remaining:
            current = path[-1]

            next_pin = min(remaining, key=lambda p:
            self._pheromone_distance(current, p))

            segment = self._pheromone_astar(current, next_pin, router)

            if segment is None:
                return None

            for point in segment[1:]:
                path.append(point)

            remaining.remove(next_pin)

        return path

    def _pheromone_distance(self, start: Tuple[int, int], goal: Tuple[int, int]) -> float:
        manhattan = abs(start[0] - goal[0]) + abs(start[1] - goal[1])

        total_pheromone = 0
        steps = max(abs(goal[0] - start[0]), abs(goal[1] - start[1]), 1)

        for t in range(steps + 1):
            x = int(start[0] + t * (goal[0] - start[0]) / steps)
            y = int(start[1] + t * (goal[1] - start[1]) / steps)
            if 0 <= x < self.grid.width and 0 <= y < self.grid.height:
                total_pheromone += self.pheromones[y, x]

        avg_pheromone = total_pheromone / (steps + 1)

        return manhattan / (1 + avg_pheromone)

    def _pheromone_astar(self, start: Tuple[int, int], goal: Tuple[int, int],
                         router) -> Optional[List[Tuple[int, int]]]:
        original_get_cost = self.grid.get_congestion_cost

        def enhanced_cost(x, y):
            base_cost = original_get_cost(x, y)
            pheromone = self.pheromones[y, x]
            return base_cost / (1 + self.beta * pheromone)

        self.grid.get_congestion_cost = enhanced_cost

        path = router._astar(start, goal)

        self.grid.get_congestion_cost = original_get_cost

        return path

    def _update_pheromones(self, solutions: List[Dict[str, List[Tuple[int, int]]]]):
        self.pheromones *= (1 - self.evaporation_rate)

        for solution in solutions:
            fitness = self.fitness_evaluator.evaluate(self.grid, solution)
            deposit = self.pheromone_deposit * (fitness - self.best_fitness + 1)

            for route in solution.values():
                for x, y in route:
                    if 0 <= x < self.grid.width and 0 <= y < self.grid.height:
                        self.pheromones[y, x] += deposit
