"""
Main entry point for PCB routing optimization
"""

import os
import sys
import argparse
import time
from typing import Dict, List, Tuple

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.parsing.def_parser import DEFParser
from src.environment.grid import RoutingGrid
from src.baselines.astar_routing import RipUpAndReroute
from src.optimization.fitness import FitnessEvaluator
from src.optimization.genetic_algorithm import GeneticAlgorithm
from src.optimization.ant_colony import AntColonyOptimization
from src.visualization.plotter import PCBVisualizer
from src.utils.helpers import save_results, calculate_metrics

SCALE = 2000  # DEF units → grid


class PCBRoutingOptimizer:

    def __init__(self, def_file: str):
        self.def_file = def_file
        self.board = None
        self.grid = None
        self.parser = DEFParser()

    def load_board(self):
        print(f"Loading board from {self.def_file}...")
        self.board = self.parser.parse(self.def_file)

        self.grid = RoutingGrid(
            width=self.board.grid.width,
            height=self.board.grid.height,
            obstacles=self.board.grid.obstacles
        )

        self.grid.capacity = self.board.grid.capacity

        print(f"Board: {self.board.name}")
        print(f"Grid: {self.grid.width} x {self.grid.height}")
        print(f"Components: {len(self.board.components)}")
        print(f"Nets: {len(self.board.nets)}")

    def build_nets(self) -> Dict[str, List[Tuple[int, int]]]:
        """🔥 FIXED NET BUILDER (CRITICAL PART)"""
        nets = {}

        for net_name, net in self.board.nets.items():
            points = []

            for comp_name, pin_name in net.pins:
                comp = self.board.components.get(comp_name)
                if not comp:
                    continue

                x = comp.x // SCALE
                y = comp.y // SCALE

                if 0 <= x < self.grid.width and 0 <= y < self.grid.height:
                    points.append((x, y))

            if len(points) >= 2:
                nets[net_name] = points

        return nets

    def run_baseline(self):
        print("\n=== BASELINE A* ===")

        nets = self.build_nets()

        print(f"Valid nets: {len(nets)} / {len(self.board.nets)}")

        router = RipUpAndReroute(self.grid)

        start = time.time()
        routes = router.route(nets)
        runtime = time.time() - start

        routed = len([r for r in routes.values() if r])

        print(f"Routed {routed}/{len(nets)} nets in {runtime:.2f}s")

        return routes

    def run_genetic_algorithm(self, generations=100, population_size=50):
        print("\n=== GENETIC ALGORITHM ===")

        nets = self.build_nets()

        fitness = FitnessEvaluator()

        ga = GeneticAlgorithm(
            grid=self.grid,
            nets=nets,
            fitness_evaluator=fitness,
            population_size=population_size,
            generations=generations
        )

        start = time.time()
        best = ga.run()
        runtime = time.time() - start

        print(f"GA done in {runtime:.2f}s")
        print(f"Fitness: {best.fitness}")

        return best.routes

    def run_ant_colony(self, iterations=100, num_ants=50):
        print("\n=== ACO ===")

        nets = self.build_nets()

        fitness = FitnessEvaluator()

        aco = AntColonyOptimization(
            grid=self.grid,
            nets=nets,
            fitness_evaluator=fitness,
            num_ants=num_ants,
            iterations=iterations
        )

        start = time.time()
        routes = aco.run()
        runtime = time.time() - start

        print(f"ACO done in {runtime:.2f}s")

        return routes

    def visualize_results(self, routes, title="Routing"):
        vis = PCBVisualizer(self.board, self.grid)

        import matplotlib.pyplot as plt

        fig, ax = vis.plot_board(routes, show_congestion=True)
        plt.suptitle(title)
        plt.show()

        return fig

    def evaluate(self, routes, name):
        self.grid.reset_usage()

        for r in routes.values():
            if r:
                self.grid.update_usage(r)

        metrics = calculate_metrics(routes, self.grid)
        metrics["algorithm"] = name

        print(f"\n--- {name} ---")
        print(metrics)

        return metrics


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("def_file")
    parser.add_argument("--visualize", action="store_true")

    args = parser.parse_args()

    opt = PCBRoutingOptimizer(args.def_file)
    opt.load_board()

    results = {}

    baseline = opt.run_baseline()
    results["baseline"] = opt.evaluate(baseline, "baseline")

    if args.visualize:
        opt.visualize_results(baseline, "Baseline")

    save_results(results, "results.json")


if __name__ == "__main__":
    main()