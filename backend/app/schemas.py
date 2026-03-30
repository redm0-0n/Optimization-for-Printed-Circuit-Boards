from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel


# ---- Boards ----

class BoardResponse(BaseModel):
    id: UUID
    name: str
    filename: str
    die_area: List[int]
    grid_width: int
    grid_height: int
    cell_size: int
    components_count: int
    nets_count: int
    components_data: Dict[str, Any]
    nets_data: Dict[str, List[List[int]]]
    created_at: datetime

    model_config = {"from_attributes": True}


# ---- Optimization ----

class OptimizeRequest(BaseModel):
    board_id: UUID
    algorithm: str                       # "baseline" | "ga" | "aco"
    parameters: Dict[str, Any] = {}


class ResultPayload(BaseModel):
    routes: Dict[str, List[List[int]]]
    metrics: Dict[str, Any]
    fitness_history: List[float]


class RunResponse(BaseModel):
    id: UUID
    board_id: UUID
    algorithm: str
    parameters: Dict[str, Any]
    status: str
    error_message: Optional[str]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    duration_seconds: Optional[float]
    board_name: Optional[str]
    result: Optional[ResultPayload]

    model_config = {"from_attributes": True}