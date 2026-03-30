"""
Core service that reconstructs grid/net data from DB and runs your
existing algorithms (A*, GA, ACO) without modifying them.
"""
import base64
import io
import time
from datetime import datetime

import numpy as np
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Board, OptimizationRun, RunResult

# ---------- numpy <-> base64 helpers ----------

def array_to_b64(arr: np.ndarray) -> str:
    buf = io.BytesIO()
    np.save(buf, arr, allow_pickle=True)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def b64_to_array(b64_str: str) -> np.ndarray:
    buf = io.BytesIO(base64.b64decode(b64_str))
    return np.load(buf, allow_pickle=True)


# ---------- main task (runs in background thread) ----------

def run_optimization_task(
    run_id: str,
    board_id: str,
    algorithm: str,
    params: dict,
):
    """
    Called via FastAPI BackgroundTasks.  Opens its own DB session
    because background threads don't share the request session.
    """
    db: Session = SessionLocal()
    try:
        run = db.query(OptimizationRun).filter(OptimizationRun.id == run_id).first()
        board = db.query(Board).filter(Board.id == board_id).first()
        if not run or not board:
            return

        run.status = "running"
        run.started_at = datetime.utcnow()
        db.commit()

        # ---- Reconstruct RoutingGrid from stored data ----
        obstacles = b64_to_array(board.obstacles_b64)
        capacity = b64_to_array(board.capacity_b64)

        from src.environment.grid import RoutingGrid
        grid = RoutingGrid(
            width=board.grid_width,
            height=board.grid_height,
            obstacles=obstacles,
            cell_size=board.cell_size,
        )
        grid.capacity = capacity

        # ---- Build nets dict ----
        nets = {
            name: [tuple(p) for p in points]
            for name, points in board.nets_data.items()
        }

        # ---- Run selected algorithm (YOUR CODE, UNCHANGED) ----
        t0 = time.time()
        fitness_history: list[float] = []

        if algorithm == "baseline":
            from src.baselines.astar_routing import RipUpAndReroute
            router = RipUpAndReroute(grid)
            routes = router.route(nets)

        elif algorithm == "ga":
            from src.optimization.fitness import FitnessEvaluator
            from src.optimization.genetic_algorithm import GeneticAlgorithm

            fe = FitnessEvaluator()
            ga = GeneticAlgorithm(
                grid=grid,
                nets=nets,
                fitness_evaluator=fe,
                population_size=int(params.get("population_size", 50)),
                generations=int(params.get("generations", 100)),
                mutation_rate=float(params.get("mutation_rate", 0.1)),
                crossover_rate=float(params.get("crossover_rate", 0.8)),
            )
            best = ga.run()
            routes = best.routes
            fitness_history = [float(f) for f in ga.best_fitness_history]

        elif algorithm == "aco":
            from src.optimization.fitness import FitnessEvaluator
            from src.optimization.ant_colony import AntColonyOptimization

            fe = FitnessEvaluator()
            aco = AntColonyOptimization(
                grid=grid,
                nets=nets,
                fitness_evaluator=fe,
                num_ants=int(params.get("num_ants", 50)),
                iterations=int(params.get("iterations", 100)),
                alpha=float(params.get("alpha", 1.0)),
                beta=float(params.get("beta", 2.0)),
                evaporation_rate=float(params.get("evaporation_rate", 0.1)),
            )
            routes = aco.run()
            fitness_history = [float(f) for f in aco.best_fitness_history]

        else:
            raise ValueError(f"Unknown algorithm: {algorithm}")

        duration = time.time() - t0

        # ---- Compute metrics (YOUR helper, UNCHANGED) ----
        from src.utils.helpers import calculate_metrics

        grid.reset_usage()
        for r in routes.values():
            if r:
                grid.update_usage(r)
        metrics = calculate_metrics(routes, grid)

        # ---- Serialize routes for JSON ----
        routes_json = {
            name: [list(pt) for pt in route] if route else []
            for name, route in routes.items()
        }

        # ---- Persist result ----
        db_result = RunResult(
            run_id=run.id,
            routes=routes_json,
            metrics=metrics,
            fitness_history=fitness_history,
            usage_b64=array_to_b64(grid.usage),
        )
        db.add(db_result)

        run.status = "completed"
        run.completed_at = datetime.utcnow()
        run.duration_seconds = duration
        db.commit()

    except Exception as exc:
        run = db.query(OptimizationRun).filter(OptimizationRun.id == run_id).first()
        if run:
            run.status = "failed"
            run.error_message = str(exc)
            run.completed_at = datetime.utcnow()
            db.commit()

    finally:
        db.close()