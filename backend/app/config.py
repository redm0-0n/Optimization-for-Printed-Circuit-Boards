import os


class Settings:
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://pcb_user:pcb_secret_2024@localhost:5432/pcb_optimizer"
    )
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "/app/data/raw")
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50 MB
    SCALE: int = 2000  # DEF physical units → grid cells


settings = Settings()