#!/usr/bin/env bash
set -euo pipefail

# Setzt die PostgreSQL-Datenbank zurück (Volume löschen) und startet neu.
# Alle Prompts/Benutzer gehen verloren!

cd "$(dirname "$0")/.."

echo "WARNUNG: Löscht das Docker-Volume postgres_data und alle DB-Daten."
read -r -p "Fortfahren? [y/N] " confirm
if [[ ! "$confirm" =~ ^[yY]$ ]]; then
  echo "Abgebrochen."
  exit 1
fi

docker compose down -v
echo ""
echo "Starte Stack mit Passwort aus .env (POSTGRES_PASSWORD)..."
docker compose up -d --build

echo ""
echo "Fertig. Logs: docker compose logs -f backend"
