FROM python:3.10-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy existing algorithm source (read-only in docker-compose)
COPY src/ ./src/

# Copy backend app code
COPY backend/app/ ./app/

# Create data directories
RUN mkdir -p /app/data/raw /app/data/processed /app/results

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]