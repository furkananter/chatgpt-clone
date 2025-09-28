#!/bin/bash
set -euo pipefail

IMAGE_NAME="chatgpt-backend"
TAG=${1:-latest}

pnpm --filter backend run build || true

docker build -t "$IMAGE_NAME:$TAG" -f docker/Dockerfile ..

echo "Pushing image $IMAGE_NAME:$TAG"
docker push "$IMAGE_NAME:$TAG"

