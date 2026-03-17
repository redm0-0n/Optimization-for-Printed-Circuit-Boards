import sys
import time
import matplotlib.pyplot as plt
from src.parsing.def_parser import DEFParser
from src.environment.grid import RoutingGrid
from src.baselines.astar_routing import RipUpAndReroute
from src.visualization.plotter import PCBVisualizer
from src.utils.helpers import calculate_metrics

def main():
    if len(sys.argv) < 2:
        print("Usage: python main.py <def_file>")
        sys.exit(1)

    parser = DEFParser()
    board = parser.parse(sys.argv[1])

    nets = {}
    for net_name, net in board.nets.items():
        pins = []
        for comp_name, pin_name in net.pins:
            comp = board.components[comp_name]
            pins.append((comp.x, comp.y))
        nets[net_name] = pins

    grid = RoutingGrid(
        width=board.grid.width,
        height=board.grid.height,
        obstacles=board.grid.obstacles
    )

    router = RipUpAndReroute(grid)
    start = time.time()
    routes = router.route(nets)
    elapsed = time.time() - start

    for route in routes.values():
        grid.update_usage(route, delta=1)
    metrics = calculate_metrics(routes, grid)

    print(f"Baseline routing completed in {elapsed:.2f}s")
    print(f"Wire length: {metrics['total_wire_length']}")
    print(f"Max congestion: {metrics['max_congestion']:.2f}")
    print(f"Success rate: {metrics['success_rate']*100:.1f}%")

    visualizer = PCBVisualizer(board, grid)
    fig, ax = visualizer.plot_board(routes, show_congestion=True)
    plt.show()

if __name__ == "__main__":
    main()