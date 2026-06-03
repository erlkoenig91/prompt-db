#!/usr/bin/env bash
set -euo pipefail

# Resets the PostgreSQL database (deletes volume) and restarts the stack.
# All prompts and users are lost!

cd "$(dirname "$0")/.."

echo "WARNING: This deletes the Docker volume postgres_data and all DB data."
read -r -p "Continue? [y/N] " confirm
if [[ ! "$confirm" =~ ^[yY]$ ]]; then
  echo "Aborted."
  exit 1
fi

docker compose down -v
echo ""
echo "Starting stack with password from .env (POSTGRES_PASSWORD)..."
docker compose up -d --build

echo ""
echo "Done. Logs: docker compose logs -f backend"
