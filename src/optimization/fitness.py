import numpy as np
from typing import Dict, List, Tuple, Optional


class FitnessEvaluator:    
    def __init__(self, weights: Dict[str, float] = None):
        self.weights = weights or {
            'wire_length': 1.0,
            'congestion': 2.0,
            'overflow': 5.0,
            'vias': 1.5,
            'infeasibility': 1000.0
        }
    
    def evaluate(self, grid, routes: Dict[str, List[Tuple[int, int]]]) -> float:
        wire_length = self._calculate_wire_length(routes)
        congestion = self._calculate_congestion(grid, routes)
        overflow = self._calculate_overflow(grid, routes)
        vias = self._calculate_vias(routes)
        infeasibility = self._check_infeasibility(grid, routes)
        
        total_cost = (
            self.weights['wire_length'] * wire_length / 1000 +  # Normalize
            self.weights['congestion'] * congestion +
            self.weights['overflow'] * overflow +
            self.weights['vias'] * vias +
            self.weights['infeasibility'] * infeasibility
        )
        
        fitness = -total_cost
        
        return fitness
    
    def _calculate_wire_length(self, routes: Dict[str, List[Tuple[int, int]]]) -> int:
        total = 0
        for route in routes.values():
            if route:
                for i in range(len(route) - 1):
                    total += abs(route[i+1][0] - route[i][0]) + abs(route[i+1][1] - route[i][1])
        return total
    
    def _calculate_congestion(self, grid, routes: Dict[str, List[Tuple[int, int]]]) -> float:
        if not routes:
            return 0
        
        original_usage = grid.usage.copy()
        grid.reset_usage()
        
        for route in routes.values():
            grid.update_usage(route, delta=1)
        
        usage_ratio = grid.usage / grid.capacity
        avg_congestion = np.mean(usage_ratio)
        
        grid.usage = original_usage
        
        return float(avg_congestion)
    
    def _calculate_overflow(self, grid, routes: Dict[str, List[Tuple[int, int]]]) -> int:
        if not routes:
            return 0
        
        original_usage = grid.usage.copy()
        grid.reset_usage()
        
        for route in routes.values():
            grid.update_usage(route, delta=1)
        
        overflow = np.sum(np.maximum(0, grid.usage - grid.capacity))
        
        grid.usage = original_usage
        
        return int(overflow)
    
    def _calculate_vias(self, routes: Dict[str, List[Tuple[int, int]]]) -> int:
        vias = 0
        for route in routes.values():
            if len(route) < 2:
                continue
            
            for i in range(1, len(route) - 1):
                prev_dir = (route[i][0] - route[i-1][0], route[i][1] - route[i-1][1])
                next_dir = (route[i+1][0] - route[i][0], route[i+1][1] - route[i][1])
                if prev_dir != next_dir:
                    vias += 1
        
        return vias
    
    def _check_infeasibility(self, grid, routes: Dict[str, List[Tuple[int, int]]]) -> float:
        penalty = 0
        
        for route in routes.values():
            if not route:
                penalty += 1
        
        for route in routes.values():
            for x, y in route:
                if not grid.is_valid(x, y):
                    penalty += 10
                    break
        
        return penalty