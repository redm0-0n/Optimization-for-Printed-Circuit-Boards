from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import boards, optimization

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PCB Routing Optimizer",
    version="1.0.0",
    description="Web interface for PCB routing optimization with A*, GA, and ACO",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(boards.router, prefix="/api/boards", tags=["Boards"])
app.include_router(optimization.router, prefix="/api/optimize", tags=["Optimization"])


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "pcb-optimizer"}