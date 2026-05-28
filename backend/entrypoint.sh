#!/bin/bash
set -euo pipefail

echo "Waiting for database..."
attempt=0
max_attempts=60
until python -c "
import asyncio
from sqlalchemy import text
from app.database import engine

async def check():
    async with engine.connect() as conn:
        await conn.execute(text('SELECT 1'))

asyncio.run(check())
"; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "ERROR: Database not reachable after ${max_attempts} attempts."
    echo "Check DATABASE_URL, postgres container, and ENVIRONMENT/ALLOW_REGISTRATION settings."
    exit 1
  fi
  sleep 2
done

echo "Running migrations..."
alembic upgrade head

echo "Seeding example prompts..."
python -m app.seed || echo "WARNING: Seed skipped or failed, continuing startup."

echo "Starting API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
