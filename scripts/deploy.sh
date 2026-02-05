#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/var/www/bestcityspots}"
COMPOSE_PROJECT_DIR="${COMPOSE_PROJECT_DIR:-$REPO_DIR}"
COMPOSE_SERVICE="${COMPOSE_SERVICE:-web}"
DOCKER_NETWORK="${DOCKER_NETWORK:-web}"
GIT_REMOTE="${GIT_REMOTE:-origin}"
GIT_BRANCH="${GIT_BRANCH:-main}"
GIT_REMOTE_URL="${GIT_REMOTE_URL:-}"
GIT_SSH_KEY="${GIT_SSH_KEY:-}"

echo "Deploying from $REPO_DIR"
cd "$REPO_DIR"

echo "Pulling latest code..."
if [[ -n "$GIT_SSH_KEY" ]]; then
  export GIT_SSH_COMMAND="ssh -i \"$GIT_SSH_KEY\" -o IdentitiesOnly=yes"
fi

if [[ -n "$GIT_REMOTE_URL" ]]; then
  git pull "$GIT_REMOTE_URL" "$GIT_BRANCH"
else
  git pull "$GIT_REMOTE" "$GIT_BRANCH"
fi

echo "Building and starting containers..."
docker compose -f "$COMPOSE_PROJECT_DIR/docker-compose.yml" up -d --build

echo "Ensuring container is connected to network: $DOCKER_NETWORK"
container_id="$(docker compose -f "$COMPOSE_PROJECT_DIR/docker-compose.yml" ps -q "$COMPOSE_SERVICE")"
if [[ -n "$container_id" ]]; then
  docker network connect "$DOCKER_NETWORK" "$container_id" >/dev/null 2>&1 || true
else
  echo "Warning: No container found for service '$COMPOSE_SERVICE'"
fi

echo "Deployment complete."