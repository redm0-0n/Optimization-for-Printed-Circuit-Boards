import numpy as np
from typing import List, Tuple, Optional, Dict
from dataclasses import dataclass
import heapq


@dataclass
class GridCell:
    x: int
    y: int
    is_obstacle: bool = False
    usage: int = 0
    capacity: int = 3
    layer: int = 0


class RoutingGrid:

    def __init__(self, width: int, height: int, obstacles: np.ndarray = None):
        self.width = width
        self.height = height
        self.cells = {}
        self.obstacles = obstacles if obstacles is not None else np.zeros((height, width), dtype=bool)
        self.usage = np.zeros((height, width), dtype=int)
        self.capacity = np.ones((height, width), dtype=int) * 3

    def get_neighbors(self, x: int, y: int) -> List[Tuple[int, int]]:
        neighbors = []
        for dx, dy in [(0, 1), (1, 0), (0, -1), (-1, 0)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < self.width and 0 <= ny < self.height:
                if not self.obstacles[ny, nx]:
                    neighbors.append((nx, ny))
        return neighbors

    def is_valid(self, x: int, y: int) -> bool:
        if 0 <= x < self.width and 0 <= y < self.height:
            return not self.obstacles[y, x]
        return False

    def get_congestion_cost(self, x: int, y: int) -> float:
        if not self.is_valid(x, y):
            return float('inf')

        usage = self.usage[y, x]
        capacity = self.capacity[y, x]

        if usage >= capacity:
            return 1.0 + (usage - capacity + 1) ** 2
        return 0.1

    def update_usage(self, path: List[Tuple[int, int]], delta: int = 1):
        for x, y in path:
            if self.is_valid(x, y):
                self.usage[y, x] += delta

    def reset_usage(self):
        self.usage = np.zeros((self.height, self.width), dtype=int)

    def get_total_wirelength(self, routes: Dict[str, List[Tuple[int, int]]]) -> int:
        total = 0
        for route in routes.values():
            if route:
                for i in range(len(route) - 1):
                    total += abs(route[i + 1][0] - route[i][0]) + abs(route[i + 1][1] - route[i][1])
        return total

    def get_max_congestion(self) -> int:
        return np.max(self.usage / self.capacity)

    def get_total_overflow(self) -> int:
        overflow = np.maximum(0, self.usage - self.capacity)
        return np.sum(overflow)
