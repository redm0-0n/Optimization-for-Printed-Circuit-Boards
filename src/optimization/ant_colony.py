import numpy as np
import random
import heapq
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
import copy

@dataclass
class Ant:
    path: List[Tuple[int, int]] = None
    length: float = 0.0

class AntColonyOptimization:
    def __init__(self, grid, nets, fitness_evaluator, num_ants=15, iterations=50, alpha=1.0,
                 beta=3.0, evaporation_rate=0.1, pheromone_deposit=2.0):
        self.grid = grid
        self.nets = nets
        self.fitness_evaluator = fitness_evaluator
        self.num_ants = num_ants
        self.iterations = iterations
        self.alpha = alpha
        self.beta = beta
        self.evaporation_rate = evaporation_rate
        self.pheromone_deposit = pheromone_deposit
        self.weights = fitness_evaluator.weights or {
            'wire_length': 1.0, 'congestion': 2.0, 'overflow': 5.0,
            'vias': 1.5, 'infeasibility': 1000.0
        }
        self.max_search_steps = (grid.width * grid.height) * 2
        self.tau_min = 0.1
        self.tau_max = 20.0
        self.pheromones = np.ones((grid.height, grid.width)) * self.tau_max * 0.3
        self.best_solution = None
        self.best_fitness = -float('inf')
        self.best_fitness_history: List[float] = []
        self.convergence_threshold = 0.001
        self.stagnation_counter = 0
        self.initial_alpha = alpha
        self.initial_beta = beta

    def run(self):
        for iteration in range(self.iterations):
            all_routes = []
            all_fitness = []
            failed_count = 0
            
            if iteration > self.iterations * 0.7:
                current_alpha = self.alpha * 1.2
                current_beta = self.beta * 1.1
            elif iteration < self.iterations * 0.3:
                current_alpha = self.alpha * 0.8
                current_beta = self.beta * 0.9
            else:
                current_alpha = self.alpha
                current_beta = self.beta
            
            for ant_id in range(self.num_ants):
                self.grid.reset_usage()
                net_names = list(self.nets.keys())
                random.shuffle(net_names)
                routes = {}
                
                for net_name in net_names:
                    pins = self.nets.get(net_name, [])
                    if len(pins) < 2:
                        routes[net_name] = pins
                        continue
                    
                    path = self._route_net_with_pheromones(pins, current_alpha, current_beta)
                    if path:
                        routes[net_name] = path
                        self.grid.update_usage(path, delta=1)
                        self._local_pheromone_update(path)
                    else:
                        routes[net_name] = []
                        failed_count += 1
                
                fitness = self._fast_evaluate(routes)
                all_routes.append(routes)
                all_fitness.append(fitness)
                
                if fitness > self.best_fitness:
                    self.best_fitness = fitness
                    self.best_solution = copy.deepcopy(routes)
                    self.stagnation_counter = 0
                else:
                    self.stagnation_counter += 1

            iter_best_idx = np.argmax(all_fitness)
            iter_best_fitness = all_fitness[iter_best_idx]
            iter_best_routes = all_routes[iter_best_idx]
            
            self.best_fitness_history.append(self.best_fitness)
            
            if len(self.best_fitness_history) > 5:
                improvement = (self.best_fitness_history[-1] - 
                             max(self.best_fitness_history[-5:-1] or [self.best_fitness_history[-1]]))
                if improvement < self.convergence_threshold:
                    current_evaporation = self.evaporation_rate * 0.8
                else:
                    current_evaporation = self.evaporation_rate
            else:
                current_evaporation = self.evaporation_rate
            
            self._update_pheromones(iter_best_routes, current_evaporation)
            
            if self.best_solution and iteration % 3 == 0:
                self._elite_pheromone_update(self.best_solution)
            
            if self.stagnation_counter > self.iterations * 0.3:
                self.pheromones = np.ones((self.grid.height, self.grid.width)) * self.tau_max * 0.3
                self.stagnation_counter = 0
            
            if (iteration + 1) % 10 == 0:
                print(f"Iteration {iteration+1}/{self.iterations}, Best Fitness: {self.best_fitness:.2f}")
        
        return self.best_solution

    def _fast_evaluate(self, routes):
        wl = 0
        vias = 0
        failed = 0
        for route in routes.values():
            if not route:
                failed += 1
                continue
            pdx = pdy = 0
            for i, (x, y) in enumerate(route):
                if i > 0:
                    dx = x - route[i-1][0]
                    dy = y - route[i-1][1]
                    wl += abs(dx) + abs(dy)
                    if i > 1 and (dx, dy) != (pdx, pdy):
                        vias += 1
                    pdx, pdy = dx, dy
        
        ur = self.grid.usage / (self.grid.capacity + 1e-6)
        cg = float(np.mean(ur))
        of_ = float(np.sum(np.maximum(0, self.grid.usage - self.grid.capacity)))
        
        cost = (self.weights['wire_length'] * wl / 1000 + 
                self.weights['congestion'] * cg +
                self.weights['overflow'] * of_ + 
                self.weights['vias'] * vias +
                self.weights['infeasibility'] * failed)
        return -cost

    def _build_solution(self):
        self.grid.reset_usage()
        net_names = list(self.nets.keys())
        random.shuffle(net_names)
        routes = {}
        for net_name in net_names:
            pins = self.nets.get(net_name, [])
            if len(pins) < 2:
                routes[net_name] = pins
                continue
            path = self._route_net_with_pheromones(pins)
            if path:
                routes[net_name] = path
                self.grid.update_usage(path, delta=1)
            else:
                routes[net_name] = []
        return routes

    def _route_net_with_pheromones(self, pins, alpha=None, beta=None):
        if alpha is None:
            alpha = self.alpha
        if beta is None:
            beta = self.beta
            
        path = [pins[0]]
        remaining = list(pins[1:])
        
        while remaining:
            current = path[-1]
            if len(remaining) > 1 and random.random() < 0.3:
                next_pin = random.choice(remaining)
            else:
                distances = [(p, self._pheromone_distance(current, p, alpha, beta)) 
                           for p in remaining]
                total_dist = sum(1.0/(d[1]+0.01) for d in distances)
                if total_dist > 0:
                    probs = [(1.0/(d[1]+0.01))/total_dist for d in distances]
                    next_pin = distances[np.random.choice(len(distances), p=probs)][0]
                else:
                    next_pin = min(remaining, key=lambda p: self._pheromone_distance(current, p, alpha, beta))
            
            segment = self._astar_pheromone(current, next_pin, alpha, beta)
            if segment is None:
                if len(remaining) > 1:
                    remaining.remove(next_pin)
                    continue
                return None
            path.extend(segment[1:])
            remaining.remove(next_pin)
        
        return path

    def _pheromone_distance(self, start, goal, alpha=None, beta=None):
        if alpha is None:
            alpha = self.alpha
        if beta is None:
            beta = self.beta
            
        manhattan = abs(start[0] - goal[0]) + abs(start[1] - goal[1])
        steps = max(abs(goal[0] - start[0]), abs(goal[1] - start[1]), 1)
        
        total_pheromone = 0
        samples = 0
        for t in range(steps + 1):
            x = int(start[0] + t * (goal[0] - start[0]) / steps)
            y = int(start[1] + t * (goal[1] - start[1]) / steps)
            if 0 <= x < self.grid.width and 0 <= y < self.grid.height:
                total_pheromone += self.pheromones[y, x] ** alpha
                samples += 1
        
        if samples > 0:
            avg_pheromone = total_pheromone / samples
            return manhattan / (1 + beta * avg_pheromone / self.tau_max)
        return manhattan

    def _astar_pheromone(self, start, goal, alpha=None, beta=None):
        if alpha is None:
            alpha = self.alpha
        if beta is None:
            beta = self.beta
            
        oset = [(0.0, start)]
        came_from = {}
        gscore = {start: 0.0}
        visited = set()
        steps_taken = 0
        
        pheromone_bias = beta / (alpha + beta + 0.01)
        
        while oset:
            steps_taken += 1
            if steps_taken > self.max_search_steps:
                return None
            
            _, current = heapq.heappop(oset)
            if current in visited:
                continue
            visited.add(current)
            
            if current == goal:
                path = [current]
                while current in came_from:
                    current = came_from[current]
                    path.append(current)
                return path[::-1]
            
            for nx, ny in self.grid.get_neighbors(current[0], current[1]):
                if (nx, ny) in visited:
                    continue
                
                base_cost = 1.0 + 0.5 * self.grid.get_congestion_cost(nx, ny)
                ph = self.pheromones[ny, nx]
                ph_normalized = min(1.0, ph / self.tau_max)
                pheromone_bonus = ph_normalized * pheromone_bias * 2.0
                move_cost = base_cost * (1.0 - pheromone_bonus)
                move_cost = max(0.1, move_cost)
                tg = gscore[current] + move_cost
                
                if (nx, ny) not in gscore or tg < gscore[(nx, ny)]:
                    gscore[(nx, ny)] = tg
                    h = abs(nx - goal[0]) + abs(ny - goal[1])
                    heapq.heappush(oset, (tg + h, (nx, ny)))
                    came_from[(nx, ny)] = current
        
        return None

    def _local_pheromone_update(self, route):
        deposit_amount = 0.5
        for x, y in route:
            self.pheromones[y, x] += deposit_amount
            if self.pheromones[y, x] > self.tau_max:
                self.pheromones[y, x] = self.tau_max

    def _update_pheromones(self, best_routes, evaporation_rate=None):
        if evaporation_rate is None:
            evaporation_rate = self.evaporation_rate
            
        self.pheromones *= (1 - evaporation_rate)
        
        if not best_routes:
            return
        
        for route in best_routes.values():
            if route:
                deposit = self.pheromone_deposit / (len(route) + 1e-6)
                for x, y in route:
                    self.pheromones[y, x] += deposit
        
        np.clip(self.pheromones, self.tau_min, self.tau_max, out=self.pheromones)

    def _elite_pheromone_update(self, elite_routes):
        elite_factor = 2.0
        for route in elite_routes.values():
            if route:
                deposit = self.pheromone_deposit * elite_factor / (len(route) + 1e-6)
                for x, y in route:
                    self.pheromones[y, x] += deposit
        
        np.clip(self.pheromones, self.tau_min, self.tau_max, out=self.pheromones)