import os

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Board
from app.schemas import BoardResponse
from app.services.optimizer import array_to_b64


def _parse_def(filepath: str):
    from src.parsing.def_parser import DEFParser
    return DEFParser().parse(filepath)

router = APIRouter()


@router.post("/upload", response_model=BoardResponse)
async def upload_def(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename or not file.filename.lower().endswith(".def"):
        raise HTTPException(status_code=400, detail="Only .def files accepted")

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 50 MB limit")

    # Persist to disk
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(settings.UPLOAD_DIR, file.filename)
    with open(filepath, "wb") as f:
        f.write(content)

    # Parse
    try:
        parsed = _parse_def(filepath)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"DEF parse error: {exc}")

    llx, lly = parsed.die_area[0], parsed.die_area[1]
    gw, gh = parsed.grid.width, parsed.grid.height
    cell_size = parsed.grid.cell_size
    obstacles = parsed.grid.obstacles

    nets_data: dict = {}
    for net_name, net in parsed.nets.items():
        pts = []
        for comp_name, _pin_name in net.pins:
            comp = parsed.components.get(comp_name)
            if not comp:
                continue

            gx = (comp.x - llx) // cell_size
            gy = (comp.y - lly) // cell_size

            pin_x, pin_y = gx, gy

            if 0 <= pin_x < gw and 0 <= pin_y < gh:
                obstacles[pin_y, pin_x] = False

            pts.append([pin_x, pin_y])

        if len(pts) >= 2:
            nets_data[net_name] = pts

    components_data: dict = {}
    for cname, comp in parsed.components.items():
        components_data[cname] = {
            "x": (comp.x - llx) // cell_size,
            "y": (comp.y - lly) // cell_size,
            "type": comp.type,
        }

    db_board = Board(
        name=parsed.name or file.filename,
        filename=file.filename,
        die_area=list(parsed.die_area),
        grid_width=gw,
        grid_height=gh,
        cell_size=cell_size,
        components_count=len(parsed.components),
        nets_count=len(parsed.nets),
        obstacles_b64=array_to_b64(obstacles),
        capacity_b64=array_to_b64(parsed.grid.capacity),
        components_data=components_data,
        nets_data=nets_data,
    )
    db.add(db_board)
    db.commit()
    db.refresh(db_board)
    return db_board


@router.get("/", response_model=list[BoardResponse])
def list_boards(db: Session = Depends(get_db)):
    return db.query(Board).order_by(Board.created_at.desc()).all()


@router.get("/{board_id}", response_model=BoardResponse)
def get_board(board_id: str, db: Session = Depends(get_db)):
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return board


@router.delete("/{board_id}")
def delete_board(board_id: str, db: Session = Depends(get_db)):
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    db.delete(board)
    db.commit()
    return {"ok": True}