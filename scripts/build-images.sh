#!/usr/bin/env bash
set -euo pipefail

# First argument: registry path, second: tag.
# Examples:
#   ./scripts/build-images.sh ghcr.io/me 1.0.0
#   PUSH=1 ./scripts/build-images.sh ghcr.io/me 1.0.0

REGISTRY="${1:-ghcr.io/erlkoenig91}"
TAG="${2:-latest}"
VITE_API_URL="${VITE_API_URL:-https://api.example.com}"
PLATFORMS="${PLATFORMS:-linux/amd64,linux/arm64}"
PUSH="${PUSH:-0}"

BACKEND_IMAGE="${REGISTRY}/prompt-db-backend:${TAG}"
FRONTEND_IMAGE="${REGISTRY}/prompt-db-frontend:${TAG}"

docker buildx inspect multiarch-builder >/dev/null 2>&1 \
  || docker buildx create --name multiarch-builder --use
docker buildx use multiarch-builder

push_args=()
if [ "${PUSH}" = "1" ]; then
  push_args=(--push)
else
  push_args=(--load)
  echo "Note: --load supports one platform only. Set PUSH=1 for multi-arch push."
  PLATFORMS="linux/$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/')"
fi

docker buildx build \
  --platform "${PLATFORMS}" \
  -t "${BACKEND_IMAGE}" \
  -f backend/Dockerfile \
  "${push_args[@]}" \
  .

docker buildx build \
  --platform "${PLATFORMS}" \
  -t "${FRONTEND_IMAGE}" \
  --build-arg "VITE_API_URL=${VITE_API_URL}" \
  -f frontend/Dockerfile \
  "${push_args[@]}" \
  .

echo "Built:"
echo "  ${BACKEND_IMAGE}"
echo "  ${FRONTEND_IMAGE}"
if [ "${PUSH}" != "1" ]; then
  echo ""
  echo "Multi-arch push:"
  echo "  PUSH=1 ./scripts/build-images.sh ${REGISTRY} ${TAG}"
fi
