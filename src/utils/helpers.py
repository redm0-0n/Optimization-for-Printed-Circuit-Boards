import os
import json
import time
from typing import Dict, List, Tuple, Any
import numpy as np


def save_results(results: Dict[str, Any], filename: str, output_dir: str = "results"):
    os.makedirs(output_dir, exist_ok=True)
    
    filepath = os.path.join(output_dir, filename)
    
    def convert_to_serializable(obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        return obj
    
    with open(filepath, 'w') as f:
        json.dump(results, f, default=convert_to_serializable, indent=2)


def load_results(filename: str, results_dir: str = "results") -> Dict[str, Any]:
    filepath = os.path.join(results_dir, filename)
    
    with open(filepath, 'r') as f:
        return json.load(f)


def calculate_metrics(routes: Dict[str, List[Tuple[int, int]]], 
                      grid) -> Dict[str, float]:
    metrics = {}
    
    total_length = 0
    for route in routes.values():
        if route:
            for i in range(len(route) - 1):
                total_length += abs(route[i+1][0] - route[i][0]) + abs(route[i+1][1] - route[i][1])
    metrics['total_wire_length'] = total_length
    
    metrics['max_congestion'] = float(np.max(grid.usage / grid.capacity))
    
    overflow = np.maximum(0, grid.usage - grid.capacity)
    metrics['total_overflow'] = int(np.sum(overflow))
    
    metrics['routed_nets'] = sum(1 for route in routes.values() if route)
    metrics['total_nets'] = len(routes)
    
    metrics['success_rate'] = metrics['routed_nets'] / metrics['total_nets'] if metrics['total_nets'] > 0 else 0
    
    return metrics


def compare_algorithms(results: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    comparison = {}
    
    for algo_name, algo_results in results.items():
        comparison[algo_name] = {
            'avg_wire_length': np.mean(algo_results.get('wire_lengths', [0])),
            'avg_max_congestion': np.mean(algo_results.get('max_congestions', [0])),
            'avg_runtime': np.mean(algo_results.get('runtimes', [0])),
            'avg_success_rate': np.mean(algo_results.get('success_rates', [0]))
        }
    
    return comparison


def timing_decorator(func):
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        end = time.time()
        if hasattr(wrapper, 'times'):
            wrapper.times.append(end - start)
        else:
            wrapper.times = [end - start]
        return result
    return wrapper