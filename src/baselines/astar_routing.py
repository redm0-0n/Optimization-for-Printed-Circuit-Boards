import heapq
import numpy as np
from typing import List, Tuple, Dict, Optional, Set
from collections import defaultdict


class AStarRouter:
    def __init__(self, grid, congestion_weight: float = 0.5):
        self.grid = grid
        self.congestion_weight = congestion_weight

    def route_net(self, pins: List[Tuple[int, int]]) -> Optional[List[Tuple[int, int]]]:
        if not pins:
            return []

        if len(pins) == 1:
            return [pins[0]]

        path = self._steiner_tree_approximation(pins)
        return path

    def _steiner_tree_approximation(self, pins: List[Tuple[int, int]]) -> List[Tuple[int, int]]:
        remaining = set(pins)
        path = []

        current = pins[0]
        remaining.remove(current)
        path.append(current)

        while remaining:
            next_pin = min(remaining, key=lambda p: abs(p[0] - current[0]) + abs(p[1] - current[1]))

            segment = self._astar(current, next_pin)

            if segment is None:
                return None

            for point in segment[1:]:
                path.append(point)

            current = next_pin
            remaining.remove(current)

        return path

    def _astar(self, start: Tuple[int, int], goal: Tuple[int, int]) -> Optional[List[Tuple[int, int]]]:

        open_set = [(self._heuristic(start, goal), 0, start)]
        heapq.heapify(open_set)

        came_from: Dict[Tuple[int, int], Tuple[int, int]] = {}

        g_scores: Dict[Tuple[int, int], float] = {start: 0}
        f_scores: Dict[Tuple[int, int], float] = {start: self._heuristic(start, goal)}

        visited = set()

        while open_set:
            current_f, current_g, current = heapq.heappop(open_set)

            if current in visited:
                continue
            visited.add(current)

            if current == goal:
                return self._reconstruct_path(came_from, start, goal)

            for neighbor in self.grid.get_neighbors(current[0], current[1]):
                if neighbor in visited:
                    continue

                move_cost = 1 + self.congestion_weight * self.grid.get_congestion_cost(neighbor[0], neighbor[1])
                tentative_g = g_scores[current] + move_cost

                if neighbor not in g_scores or tentative_g < g_scores[neighbor]:
                    came_from[neighbor] = current
                    g_scores[neighbor] = tentative_g
                    f_scores[neighbor] = tentative_g + self._heuristic(neighbor, goal)
                    heapq.heappush(open_set, (f_scores[neighbor], tentative_g, neighbor))

        return None

    def _heuristic(self, point: Tuple[int, int], goal: Tuple[int, int]) -> float:
        return abs(point[0] - goal[0]) + abs(point[1] - goal[1])

    def _reconstruct_path(self, came_from: Dict, start: Tuple[int, int], goal: Tuple[int, int]) -> List[
        Tuple[int, int]]:
        path = [goal]
        current = goal

        while current != start:
            current = came_from[current]
            path.append(current)

        path.reverse()
        return path


class RipUpAndReroute:
    def __init__(self, grid, max_iterations: int = 10):
        self.grid = grid
        self.router = AStarRouter(grid)
        self.max_iterations = max_iterations

    def route(self, nets: Dict[str, List[Tuple[int, int]]]) -> Dict[str, List[Tuple[int, int]]]:

        routes: Dict[str, List[Tuple[int, int]]] = {}
        failed_nets: Set[str] = set()

        for net_name, pins in nets.items():
            route = self.router.route_net(pins)
            if route:
                routes[net_name] = route
                self.grid.update_usage(route, delta=1)
            else:
                failed_nets.add(net_name)

        for iteration in range(self.max_iterations):
            if not failed_nets:
                break

            for net_name in failed_nets:
                if net_name in routes:
                    self.grid.update_usage(routes[net_name], delta=-1)
                    del routes[net_name]

            new_failed = set()
            for net_name in sorted(failed_nets, key=lambda n: len(nets[n])):
                route = self.router.route_net(nets[net_name])
                if route:
                    routes[net_name] = route
                    self.grid.update_usage(route, delta=1)
                else:
                    new_failed.add(net_name)

            failed_nets = new_failed

        return routes
