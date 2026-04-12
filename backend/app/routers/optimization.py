from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Board, OptimizationRun
from app.schemas import OptimizeRequest, RunResponse, ResultPayload
from app.services.optimizer import run_optimization_task

router = APIRouter()


def _format_run(run: OptimizationRun, db: Session) -> RunResponse:
    """Helper to serialize a run with optional nested result."""
    board_name = None
    if run.board_id:
        board = db.query(Board).filter(Board.id == run.board_id).first()
        board_name = board.name if board else None

    result_payload = None
    if run.result:
        result_payload = ResultPayload(
            routes=run.result.routes,
            metrics=run.result.metrics,
            fitness_history=run.result.fitness_history or [],
        )

    return RunResponse(
        id=run.id,
        board_id=run.board_id,
        algorithm=run.algorithm,
        parameters=run.parameters or {},
        status=run.status,
        error_message=run.error_message,
        created_at=run.created_at,
        started_at=run.started_at,
        completed_at=run.completed_at,
        duration_seconds=run.duration_seconds,
        board_name=board_name,
        result=result_payload,
    )


@router.post("/", response_model=RunResponse)
def start_optimization(
    req: OptimizeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    board = db.query(Board).filter(Board.id == str(req.board_id)).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    if req.algorithm not in ("baseline", "ga", "aco"):
        raise HTTPException(status_code=400, detail="Algorithm must be baseline, ga, or aco")

    run = OptimizationRun(
        board_id=board.id,
        algorithm=req.algorithm,
        parameters=req.parameters or {},
        status="pending",
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    background_tasks.add_task(
        run_optimization_task,
        str(run.id),
        str(board.id),
        req.algorithm,
        req.parameters or {},
    )
    return _format_run(run, db)


@router.get("/runs", response_model=list[RunResponse])
def list_runs(db: Session = Depends(get_db)):
    runs = db.query(OptimizationRun).order_by(OptimizationRun.created_at.desc()).all()
    return [_format_run(r, db) for r in runs]


@router.get("/runs/{run_id}", response_model=RunResponse)
def get_run(run_id: str, db: Session = Depends(get_db)):
    run = db.query(OptimizationRun).filter(OptimizationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return _format_run(run, db)


@router.delete("/runs/{run_id}")
def delete_run(run_id: str, db: Session = Depends(get_db)):
    run = db.query(OptimizationRun).filter(OptimizationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    db.delete(run)
    db.commit()
    return {"ok": True}


@router.post("/compare")
def compare_runs(run_ids: list[str], db: Session = Depends(get_db)):
    """Compare metrics of multiple completed runs side by side."""
    runs = (
        db.query(OptimizationRun)
        .filter(OptimizationRun.id.in_(run_ids))
        .filter(OptimizationRun.status == "completed")
        .all()
    )
    comparison = {}
    for run in runs:
        if run.result and run.result.metrics:
            comparison[run.algorithm] = {
                "run_id": str(run.id),
                **run.result.metrics,
            }
    return {"comparison": comparison, "count": len(runs)}