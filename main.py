"""
Main entry point for PCB routing optimization
"""

import os
import sys
import argparse
import time
from typing import Dict, List, Tuple

# Add src to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.parsing.def_parser import DEFParser
from src.environment.grid import RoutingGrid
from src.baselines.astar_routing import AStarRouter, RipUpAndReroute
from src.optimization.fitness import FitnessEvaluator
from src.optimization.genetic_algorithm import GeneticAlgorithm
from src.optimization.ant_colony import AntColonyOptimization
from src.visualization.plotter import PCBVisualizer
from src.utils.helpers import save_results, calculate_metrics, timing_decorator


class PCBRoutingOptimizer:
    """Main class for PCB routing optimization"""
    
    def __init__(self, def_file: str):
        self.def_file = def_file
        self.board = None
        self.grid = None
        self.parser = DEFParser()
        
    def load_board(self):
        """Load board from DEF file"""
        print(f"Loading board from {self.def_file}...")
        self.board = self.parser.parse(self.def_file)
        
        # Create grid
        self.grid = RoutingGrid(
            width=self.board.grid.width,
            height=self.board.grid.height,
            obstacles=self.board.grid.obstacles
        )
        self.grid.capacity = self.board.grid.capacity
        print(f"Board loaded: {self.board.name}")
        print(f"Grid size: {self.grid.width} x {self.grid.height}")
        print(f"Number of components: {len(self.board.components)}")
        print(f"Number of nets: {len(self.board.nets)}")
        
    def run_baseline(self) -> Dict[str, List[Tuple[int, int]]]:
        """Run baseline A* with rip-up and reroute"""
        print("\n" + "="*50)
        print("Running Baseline A* with Rip-Up and Reroute...")
        print("="*50)
        
        # Prepare nets for routing
        nets = {}
        for net_name, net in self.board.nets.items():
            pin_positions = []
            for comp_name, pin_name in net.pins:
                if comp_name in self.board.components:
                    comp = self.board.components[comp_name]
                    pin_positions.append((comp.x, comp.y))
            nets[net_name] = pin_positions
        
        # Route
        router = RipUpAndReroute(self.grid)
        start_time = time.time()
        routes = router.route(nets)
        runtime = time.time() - start_time
        
        print(f"Baseline routing completed in {runtime:.2f} seconds")
        print(f"Routed {len([r for r in routes.values() if r])}/{len(nets)} nets")
        
        return routes
    
    def run_genetic_algorithm(self, generations: int = 100, 
                              population_size: int = 50) -> Dict[str, List[Tuple[int, int]]]:
        """Run Genetic Algorithm optimization"""
        print("\n" + "="*50)
        print("Running Genetic Algorithm...")
        print("="*50)
        
        # Prepare nets
        nets = {}
        for net_name, net in self.board.nets.items():
            pin_positions = []
            for comp_name, pin_name in net.pins:
                if comp_name in self.board.components:
                    comp = self.board.components[comp_name]
                    pin_positions.append((comp.x, comp.y))
            nets[net_name] = pin_positions
        
        # Initialize fitness evaluator
        fitness_evaluator = FitnessEvaluator()
        
        # Run GA
        ga = GeneticAlgorithm(
            grid=self.grid,
            nets=nets,
            fitness_evaluator=fitness_evaluator,
            population_size=population_size,
            generations=generations
        )
        
        start_time = time.time()
        best_individual = ga.run()
        runtime = time.time() - start_time
        
        print(f"GA completed in {runtime:.2f} seconds")
        print(f"Best fitness: {best_individual.fitness:.2f}")
        print(f"Best fitness history: {len(ga.best_fitness_history)} generations")
        
        return best_individual.routes
    
    def run_ant_colony(self, iterations: int = 100, 
                       num_ants: int = 50) -> Dict[str, List[Tuple[int, int]]]:
        """Run Ant Colony Optimization"""
        print("\n" + "="*50)
        print("Running Ant Colony Optimization...")
        print("="*50)
        
        # Prepare nets
        nets = {}
        for net_name, net in self.board.nets.items():
            pin_positions = []
            for comp_name, pin_name in net.pins:
                if comp_name in self.board.components:
                    comp = self.board.components[comp_name]
                    pin_positions.append((comp.x, comp.y))
            nets[net_name] = pin_positions
        
        # Initialize fitness evaluator
        fitness_evaluator = FitnessEvaluator()
        
        # Run ACO
        aco = AntColonyOptimization(
            grid=self.grid,
            nets=nets,
            fitness_evaluator=fitness_evaluator,
            num_ants=num_ants,
            iterations=iterations
        )
        
        start_time = time.time()
        routes = aco.run()
        runtime = time.time() - start_time
        
        print(f"ACO completed in {runtime:.2f} seconds")
        print(f"Best fitness: {aco.best_fitness:.2f}")
        
        return routes
    
    def visualize_results(self, routes: Dict[str, List[Tuple[int, int]]], 
                          title: str = "Routing Result"):
        """Visualize routing results"""
        visualizer = PCBVisualizer(self.board, self.grid)
        
        # Plot board with routes
        fig, ax = visualizer.plot_board(routes, show_congestion=True)
        plt.suptitle(title)
        plt.show()
        
        # Plot congestion heatmap
        fig, axes = visualizer.plot_congestion_heatmap(routes)
        plt.suptitle(f"{title} - Congestion Analysis")
        plt.show()
        
        return fig
    
    def evaluate_solution(self, routes: Dict[str, List[Tuple[int, int]]], 
                          name: str) -> Dict[str, float]:
        """Evaluate solution metrics"""
        # Reset usage for evaluation
        self.grid.reset_usage()
        for route in routes.values():
            if route:
                self.grid.update_usage(route, delta=1)
        
        # Calculate metrics
        metrics = calculate_metrics(routes, self.grid)
        metrics['algorithm'] = name
        
        print(f"\n--- {name} Results ---")
        print(f"Total wire length: {metrics['total_wire_length']}")
        print(f"Max congestion: {metrics['max_congestion']:.2f}")
        print(f"Total overflow: {metrics['total_overflow']}")
        print(f"Success rate: {metrics['success_rate']*100:.1f}%")
        
        return metrics


def main():
    """Main execution function"""
    parser = argparse.ArgumentParser(description='PCB Routing Optimization')
    parser.add_argument('def_file', help='Path to DEF file')
    parser.add_argument('--ga_generations', type=int, default=100, help='GA generations')
    parser.add_argument('--ga_population', type=int, default=50, help='GA population size')
    parser.add_argument('--aco_iterations', type=int, default=100, help='ACO iterations')
    parser.add_argument('--aco_ants', type=int, default=50, help='Number of ants')
    parser.add_argument('--no_baseline', action='store_true', help='Skip baseline')
    parser.add_argument('--no_ga', action='store_true', help='Skip GA')
    parser.add_argument('--no_aco', action='store_true', help='Skip ACO')
    parser.add_argument('--visualize', action='store_true', help='Visualize results')
    
    args = parser.parse_args()
    
    # Initialize optimizer
    optimizer = PCBRoutingOptimizer(args.def_file)
    optimizer.load_board()
    
    results = {}
    
    # Run baseline
    if not args.no_baseline:
        baseline_routes = optimizer.run_baseline()
        baseline_metrics = optimizer.evaluate_solution(baseline_routes, "Baseline")
        results['baseline'] = baseline_metrics
        
        if args.visualize:
            optimizer.visualize_results(baseline_routes, "Baseline A* Routing")
    
    # Run Genetic Algorithm
    if not args.no_ga:
        ga_routes = optimizer.run_genetic_algorithm(
            generations=args.ga_generations,
            population_size=args.ga_population
        )
        ga_metrics = optimizer.evaluate_solution(ga_routes, "Genetic Algorithm")
        results['genetic_algorithm'] = ga_metrics
        
        if args.visualize:
            optimizer.visualize_results(ga_routes, "Genetic Algorithm Routing")
    
    # Run Ant Colony Optimization
    if not args.no_aco:
        aco_routes = optimizer.run_ant_colony(
            iterations=args.aco_iterations,
            num_ants=args.aco_ants
        )
        aco_metrics = optimizer.evaluate_solution(aco_routes, "Ant Colony Optimization")
        results['ant_colony'] = aco_metrics
        
        if args.visualize:
            optimizer.visualize_results(aco_routes, "Ant Colony Optimization Routing")
    
    # Save results
    save_results(results, f"results_{optimizer.board.name}.json")
    print("\n" + "="*50)
    print("Results saved to results/")
    print("="*50)
    
    return results


if __name__ == "__main__":
    main()