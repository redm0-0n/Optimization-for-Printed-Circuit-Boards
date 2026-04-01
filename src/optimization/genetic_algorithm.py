import numpy as np
import random
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass, field
import copy


@dataclass
class Individual:
    routes: Dict[str, List[Tuple[int, int]]]
    fitness: float = 0.0
    net_order: List[str] = field(default_factory=list)


class GeneticAlgorithm:

    def __init__(self,
                 grid,
                 nets: Dict[str, List[Tuple[int, int]]],
                 fitness_evaluator,
                 population_size: int = 50,
                 generations: int = 100,
                 mutation_rate: float = 0.2,
                 crossover_rate: float = 0.8,
                 elite_size: int = 2):

        self.grid = grid
        self.nets = nets
        self.fitness_evaluator = fitness_evaluator
        self.population_size = population_size
        self.generations = generations
        self.mutation_rate = mutation_rate
        self.crossover_rate = crossover_rate
        self.elite_size = elite_size

        # The population is now just a list of net orderings (DNA)
        self.population: List[List[str]] = []
        self.best_individual: Optional[Individual] = None
        self.best_fitness_history: List[float] = []

    def _evaluate_individual(self, net_order: List[str]) -> Tuple[float, Dict]:
        """Route the nets in a specific order and calculate fitness."""
        self.grid.reset_usage()
        from src.baselines.astar_routing import AStarRouter
        router = AStarRouter(self.grid)

        routes = {}
        for net_name in net_order:
            pins = self.nets.get(net_name, [])
            if len(pins) < 2:
                routes[net_name] = pins
                continue

            route = router.route_net(pins)
            if route:
                routes[net_name] = route
                self.grid.update_usage(route, delta=1)
            else:
                routes[net_name] = []

        fitness = self.fitness_evaluator.evaluate(self.grid, routes)
        return fitness, routes

    def _initialize_population(self):
        net_names = list(self.nets.keys())
        for _ in range(self.population_size):
            order = net_names.copy()
            random.shuffle(order)
            self.population.append(order)

    def _tournament_selection(self, fitnesses: List[float], tournament_size: int = 3) -> List[str]:
        indices = random.sample(range(len(self.population)), tournament_size)
        best_idx = max(indices, key=lambda i: fitnesses[i])
        return self.population[best_idx]

    def _order_crossover(self, p1: List[str], p2: List[str]) -> List[str]:
        """OX Crossover: preserves relative net ordering from both parents."""
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

    def _mutate_order(self, order: List[str]) -> List[str]:
        """Swap Mutation: swaps two random nets in the sequence."""
        idx1, idx2 = random.sample(range(len(order)), 2)
        order[idx1], order[idx2] = order[idx2], order[idx1]
        return order

    def run(self) -> Individual:
        self._initialize_population()
        best_routes = None
        best_fitness = -float('inf')

        for gen in range(self.generations):
            fitnesses = []

            # Evaluate all individuals in this generation
            for i, order in enumerate(self.population):
                fit, routes = self._evaluate_individual(order)
                fitnesses.append(fit)

                # Track global best
                if fit > best_fitness:
                    best_fitness = fit
                    best_routes = routes

            self.best_fitness_history.append(best_fitness)

            next_population = []

            # Elitism: keep the absolute best ordering
            best_idx = int(np.argmax(fitnesses))
            next_population.append(self.population[best_idx].copy())

            if self.elite_size > 1:
                sorted_indices = np.argsort(fitnesses)[::-1]
                for e in range(1, self.elite_size):
                    next_population.append(self.population[sorted_indices[e]].copy())

            # Breed the rest of the new generation
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