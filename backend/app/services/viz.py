"""
Optional: server-side matplotlib image generation for downloads.
The frontend uses its own Canvas renderer for interactive viewing;
this is for export / sharing only.
"""
import base64
import io

import numpy as np


def generate_image(board, routes_dict: dict, show_congestion: bool = False) -> str:
    """Return a base64-encoded PNG string of the board visualization."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import matplotlib.patches as patches

    fig, ax = plt.subplots(figsize=(12, 10))
    gw, gh = board.grid_width, board.grid_height

    # Board boundary
    ax.add_patch(patches.Rectangle(
        (0, 0), gw, gh, lw=2, edgecolor="white", facecolor="none"
    ))

    # Components
    for _name, comp in (board.components_data or {}).items():
        x, y = comp["x"], comp["y"]
        w = 1
        ax.add_patch(patches.Rectangle(
            (x - w / 2, y - w / 2), w, w,
            lw=0.8, edgecolor="#4488ff", facecolor="#1a3366", alpha=0.7,
        ))
        ax.text(x, y, comp.get("type", ""), ha="center", va="center",
                fontsize=5, color="white")

    # Routes
    colors = plt.cm.tab20(np.linspace(0, 1, max(len(routes_dict), 1)))
    for i, (_net, route) in enumerate(routes_dict.items()):
        if route and len(route) >= 2:
            xs = [p[0] for p in route]
            ys = [p[1] for p in route]
            ax.plot(xs, ys, color=colors[i % len(colors)], lw=1.2, markersize=1.5)

    ax.set_facecolor("#0c1117")
    fig.patch.set_facecolor("#0c1117")
    ax.tick_params(colors="#8b949e")
    ax.set_title(board.name, color="#e6edf3", fontsize=14)
    ax.grid(True, alpha=0.1, color="#30363d")
    plt.tight_layout()

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, facecolor="#0c1117")
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")