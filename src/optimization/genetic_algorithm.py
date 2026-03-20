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
                 population_size: int = 100,
                 generations: int = 200,
                 mutation_rate: float = 0.1,
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

        self.population: List[Individual] = []
        self.best_individual: Optional[Individual] = None
        self.best_fitness_history: List[float] = []

    def run(self) -> Individual:

        self._initialize_population()

        for generation in range(self.generations):
            self._evaluate_population()

            current_best = max(self.population, key=lambda x: x.fitness)
            if self.best_individual is None or current_best.fitness > self.best_individual.fitness:
                self.best_individual = copy.deepcopy(current_best)

            self.best_fitness_history.append(self.best_individual.fitness)

            next_population = []

            sorted_pop = sorted(self.population, key=lambda x: x.fitness, reverse=True)
            next_population.extend(sorted_pop[:self.elite_size])

            while len(next_population) < self.population_size:
                parent1 = self._tournament_selection()
                parent2 = self._tournament_selection()

                if random.random() < self.crossover_rate:
                    child = self._crossover(parent1, parent2)
                else:
                    child = copy.deepcopy(parent1)

                if random.random() < self.mutation_rate:
                    child = self._mutate(child)

                next_population.append(child)

            self.population = next_population

            if generation > 50 and self.best_fitness_history[-1] == self.best_fitness_history[-10]:
                self.mutation_rate = min(0.5, self.mutation_rate * 1.1)

        return self.best_individual

    def _initialize_population(self):
        from src.baselines.astar_routing import AStarRouter, RipUpAndReroute

        baseline_router = RipUpAndReroute(self.grid)
        baseline_routes = baseline_router.route(self.nets)

        baseline_individual = Individual(routes=baseline_routes)
        self.population.append(baseline_individual)

        router = AStarRouter(self.grid)

        for i in range(self.population_size - 1):
            net_names = list(self.nets.keys())
            random.shuffle(net_names)

            routes = {}
            self.grid.reset_usage()

            for net_name in net_names:
                route = router.route_net(self.nets[net_name])
                if route:
                    routes[net_name] = route
                    self.grid.update_usage(route, delta=1)

            individual = Individual(routes=routes, net_order=net_names)
            self.population.append(individual)

    def _evaluate_population(self):
        for individual in self.population:
            individual.fitness = self.fitness_evaluator.evaluate(self.grid, individual.routes)

    def _tournament_selection(self, tournament_size: int = 3) -> Individual:
        tournament = random.sample(self.population, tournament_size)
        return max(tournament, key=lambda x: x.fitness)

    def _crossover(self, parent1: Individual, parent2: Individual) -> Individual:
        child_routes = {}

        for net_name in self.nets.keys():
            if random.random() < 0.5 and net_name in parent1.routes:
                child_routes[net_name] = copy.deepcopy(parent1.routes[net_name])
            elif net_name in parent2.routes:
                child_routes[net_name] = copy.deepcopy(parent2.routes[net_name])
            else:
                child_routes[net_name] = []

        child_routes = self._repair_routes(child_routes)

        return Individual(routes=child_routes)

    def _mutate(self, individual: Individual) -> Individual:
        from src.baselines.astar_routing import AStarRouter

        router = AStarRouter(self.grid)
        mutated = copy.deepcopy(individual)

        mutation_type = random.choice(['reroute', 'detour', 'reorder'])

        if mutation_type == 'reroute' and mutated.routes:
            net_name = random.choice(list(mutated.routes.keys()))
            new_route = router.route_net(self.nets[net_name])
            if new_route:
                mutated.routes[net_name] = new_route

        elif mutation_type == 'detour' and mutated.routes:
            net_name = random.choice(list(mutated.routes.keys()))
            route = mutated.routes[net_name]
            if len(route) > 2:
                idx = random.randint(1, len(route) - 2)
                dx = random.choice([-1, 0, 1])
                dy = random.choice([-1, 0, 1])
                if self.grid.is_valid(route[idx][0] + dx, route[idx][1] + dy):
                    route[idx] = (route[idx][0] + dx, route[idx][1] + dy)

        elif mutation_type == 'reorder':
            net_order = list(mutated.routes.keys())
            random.shuffle(net_order)
            mutated.net_order = net_order

            self.grid.reset_usage()
            new_routes = {}
            for net_name in net_order:
                route = router.route_net(self.nets[net_name])
                if route:
                    new_routes[net_name] = route
                    self.grid.update_usage(route, delta=1)
                else:
                    new_routes[net_name] = mutated.routes.get(net_name, [])
            mutated.routes = new_routes

        return mutated

    def _repair_routes(self, routes: Dict[str, List[Tuple[int, int]]]) -> Dict[str, List[Tuple[int, int]]]:
        from src.baselines.astar_routing import AStarRouter

        router = AStarRouter(self.grid)
        repaired = {}

        self.grid.reset_usage()

        net_sizes = [(name, len(self.nets[name])) for name in routes.keys()]
        net_sizes.sort(key=lambda x: x[1])

        for net_name, _ in net_sizes:
            route = router.route_net(self.nets[net_name])
            if route:
                repaired[net_name] = route
                self.grid.update_usage(route, delta=1)
            else:
                repaired[net_name] = routes.get(net_name, [])

        return repaired
