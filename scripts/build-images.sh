#!/usr/bin/env bash
set -euo pipefail

# Registry-Pfad als erstes Argument, Tag als zweites.
# Beispiel:
#   ./scripts/build-images.sh ghcr.io/me 1.0.0

REGISTRY="${1:-ghcr.io/erlkoenig91}"
TAG="${2:-latest}"
VITE_API_URL="${VITE_API_URL:-https://api.example.com}"

BACKEND_IMAGE="${REGISTRY}/prompt-db-backend:${TAG}"
FRONTEND_IMAGE="${REGISTRY}/prompt-db-frontend:${TAG}"

docker build -t "${BACKEND_IMAGE}" -f backend/Dockerfile .
docker build -t "${FRONTEND_IMAGE}" \
  --build-arg "VITE_API_URL=${VITE_API_URL}" \
  -f frontend/Dockerfile .

echo "Built:"
echo "  ${BACKEND_IMAGE}"
echo "  ${FRONTEND_IMAGE}"
echo ""
echo "Push with:"
echo "  docker login ${REGISTRY%%/*}"
echo "  docker push ${BACKEND_IMAGE}"
echo "  docker push ${FRONTEND_IMAGE}"
