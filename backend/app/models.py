import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Integer, Float, DateTime, ForeignKey,
    Text, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Board(Base):
    __tablename__ = "boards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    die_area = Column(JSON, nullable=False)            # [llx, lly, urx, ury]
    grid_width = Column(Integer, nullable=False)
    grid_height = Column(Integer, nullable=False)
    cell_size = Column(Integer, default=400)
    components_count = Column(Integer, default=0)
    nets_count = Column(Integer, default=0)
    obstacles_b64 = Column(Text, nullable=False)       # base64 numpy
    capacity_b64 = Column(Text, nullable=False)        # base64 numpy
    components_data = Column(JSON, default=dict)       # {name: {x, y, type}}
    nets_data = Column(JSON, default=dict)             # {name: [[x,y],...]}
    created_at = Column(DateTime, default=datetime.utcnow)

    runs = relationship(
        "OptimizationRun", back_populates="board",
        cascade="all, delete-orphan"
    )


class OptimizationRun(Base):
    __tablename__ = "optimization_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    board_id = Column(UUID(as_uuid=True), ForeignKey("boards.id"), nullable=False)
    algorithm = Column(String(50), nullable=False)     # baseline | ga | aco
    parameters = Column(JSON, default=dict)
    status = Column(String(20), default="pending")     # pending|running|completed|failed
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Float, nullable=True)

    board = relationship("Board", back_populates="runs")
    result = relationship(
        "RunResult", back_populates="run",
        uselist=False, cascade="all, delete-orphan"
    )


class RunResult(Base):
    __tablename__ = "run_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey("optimization_runs.id"),
                     unique=True, nullable=False)
    routes = Column(JSON, default=dict)                # {net: [[x,y],...]}
    metrics = Column(JSON, default=dict)
    fitness_history = Column(JSON, default=list)       # [float,...]
    usage_b64 = Column(Text, nullable=True)            # base64 numpy

    run = relationship("OptimizationRun", back_populates="result")