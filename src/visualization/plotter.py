import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
from typing import List, Tuple, Dict, Optional
import matplotlib.colors as mcolors


class PCBVisualizer:
    
    def __init__(self, board, grid):
        self.board = board
        self.grid = grid
        self.cell_size = grid.cell_size
        
    def plot_board(self, routes: Optional[Dict[str, List[Tuple[int, int]]]] = None,
                   show_congestion: bool = False, figsize: Tuple[int, int] = (12, 10)):
        
        fig, ax = plt.subplots(1, 1, figsize=figsize)
        
        llx, lly, urx, ury = self.board.die_area
        rect = patches.Rectangle((llx, lly), urx - llx, ury - lly, 
                                  linewidth=2, edgecolor='black', facecolor='none')
        ax.add_patch(rect)
        
        for comp in self.board.components.values():
            self._plot_component(ax, comp)
        
        if show_congestion:
            self._plot_congestion_heatmap(ax)
        
        if routes:
            colors = list(mcolors.TABLEAU_COLORS.keys())
            for i, (net_name, route) in enumerate(routes.items()):
                if route:
                    color = colors[i % len(colors)]
                    self._plot_route(ax, route, color, net_name)
        
        ax.set_xlim(llx - 2000, urx + 2000)
        ax.set_ylim(lly - 2000, ury + 2000)
        ax.set_aspect('equal')
        ax.set_xlabel('X (microns)')
        ax.set_ylabel('Y (microns)')
        ax.set_title(f'PCB Board: {self.board.name}')
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        return fig, ax
    
    def _plot_component(self, ax, component):
        width = 400 
        height = 400
        
        rect = patches.Rectangle((component.x - width//2, component.y - height//2),
                                  width, height, linewidth=1, 
                                  edgecolor='blue', facecolor='lightblue', alpha=0.7)
        ax.add_patch(rect)
        
        ax.text(component.x, component.y, component.type, 
                ha='center', va='center', fontsize=8, fontweight='bold')
    
    def _plot_route(self, ax, route: List[Tuple[int, int]], color: str, label: str):
        if not route:
            return
        
        physical_points = []
        for x, y in route:
            phys_x = self.board.llx + x * self.cell_size
            phys_y = self.board.lly + y * self.cell_size
            physical_points.append((phys_x, phys_y))
        
        xs = [p[0] for p in physical_points]
        ys = [p[1] for p in physical_points]
        
        ax.plot(xs, ys, color=color, linewidth=2, marker='o', markersize=3, label=label)
    
    def _plot_congestion_heatmap(self, ax):
        if self.grid.usage is None:
            return
        
        congestion_ratio = self.grid.usage / self.grid.capacity
        congestion_ratio = np.clip(congestion_ratio, 0, 3)  # Cap at 3x
        
        extent = [self.board.llx, self.board.llx + self.grid.width * self.cell_size,
                  self.board.lly, self.board.lly + self.grid.height * self.cell_size]
        
        im = ax.imshow(congestion_ratio, extent=extent, origin='lower',
                       cmap='YlOrRd', alpha=0.5, aspect='auto')
        
        plt.colorbar(im, ax=ax, label='Congestion (usage/capacity)')
    
    def plot_congestion_heatmap(self, routes: Optional[Dict[str, List[Tuple[int, int]]]] = None,
                                 figsize: Tuple[int, int] = (10, 8)):        
        fig, axes = plt.subplots(1, 2, figsize=figsize)
        
        if routes:
            original_usage = self.grid.usage.copy()
            self.grid.reset_usage()
            for route in routes.values():
                self.grid.update_usage(route, delta=1)
        
        im1 = axes[0].imshow(self.grid.usage, cmap='YlOrRd', origin='lower', aspect='auto')
        axes[0].set_title('Grid Usage')
        axes[0].set_xlabel('Grid X')
        axes[0].set_ylabel('Grid Y')
        plt.colorbar(im1, ax=axes[0], label='Number of routes')
        
        congestion_ratio = self.grid.usage / self.grid.capacity
        congestion_ratio = np.clip(congestion_ratio, 0, 3)
        
        im2 = axes[1].imshow(congestion_ratio, cmap='YlOrRd', origin='lower', aspect='auto')
        axes[1].set_title('Congestion Ratio (usage/capacity)')
        axes[1].set_xlabel('Grid X')
        axes[1].set_ylabel('Grid Y')
        plt.colorbar(im2, ax=axes[1], label='Congestion')
        
        if routes:
            self.grid.usage = original_usage
        
        plt.tight_layout()
        return fig, axes
    
    def plot_convergence(self, fitness_histories: Dict[str, List[float]], 
                         figsize: Tuple[int, int] = (10, 6)):        
        fig, ax = plt.subplots(1, 1, figsize=figsize)
        
        for label, history in fitness_histories.items():
            ax.plot(history, linewidth=2, label=label)
        
        ax.set_xlabel('Iteration/Generation')
        ax.set_ylabel('Fitness (higher is better)')
        ax.set_title('Algorithm Convergence Comparison')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        return fig, ax