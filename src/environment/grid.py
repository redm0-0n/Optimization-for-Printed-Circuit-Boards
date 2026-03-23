import numpy as np
from typing import List, Tuple, Dict


class RoutingGrid:
    def __init__(self, width: int, height: int, obstacles: np.ndarray = None,
                 cell_size: int = 400,
                 llx: int = 0, lly: int = 0):

        self.width = width
        self.height = height

        # 🔥 FIX: missing attributes (needed by plotter)
        self.cell_size = cell_size
        self.llx = llx
        self.lly = lly

        self.obstacles = obstacles if obstacles is not None else np.zeros((height, width), dtype=bool)
        self.usage = np.zeros((height, width), dtype=int)
        self.capacity = np.ones((height, width), dtype=int) * 3

    def to_grid(self, x: int, y: int) -> Tuple[int, int]:
        """Physical -> grid coords"""
        gx = (x - self.llx) // self.cell_size
        gy = (y - self.lly) // self.cell_size
        return int(gx), int(gy)

    def is_valid(self, x: int, y: int) -> bool:
        return (
            0 <= x < self.width and
            0 <= y < self.height and
            not self.obstacles[y, x]
        )

    def get_neighbors(self, x: int, y: int):
        for dx, dy in [(1,0), (-1,0), (0,1), (0,-1)]:
            nx, ny = x + dx, y + dy
            if self.is_valid(nx, ny):
                yield nx, ny

    def update_usage(self, path: List[Tuple[int, int]], delta: int = 1):
        for x, y in path:
            if self.is_valid(x, y):
                self.usage[y, x] += delta

    def reset_usage(self):
        self.usage.fill(0)

    def get_congestion_cost(self, x: int, y: int) -> float:
        if not self.is_valid(x, y):
            return float("inf")

        u = self.usage[y, x]
        c = self.capacity[y, x]

        return 1.0 + max(0, u - c) ** 2

    def get_total_wirelength(self, routes: Dict[str, List[Tuple[int, int]]]) -> int:
        total = 0
        for route in routes.values():
            for i in range(len(route) - 1):
                x1, y1 = route[i]
                x2, y2 = route[i + 1]
                total += abs(x1 - x2) + abs(y1 - y2)
        return total

    def get_max_congestion(self):
        return float(np.max(self.usage / self.capacity))

    def get_total_overflow(self):
        return int(np.sum(np.maximum(0, self.usage - self.capacity)))