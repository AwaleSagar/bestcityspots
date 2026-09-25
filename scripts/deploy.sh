#!/usr/bin/env bash
set -Eeuo pipefail

# Best City Spots deployment script v2.
#
# Defaults target the production host layout used by the original script:
#   REPO_DIR=/var/www/bestcityspots ./scripts/deploy.sh
#
# Common overrides:
#   GIT_BRANCH=main DEPLOY_HEALTH_URL=https://bestcityspots.com ./scripts/deploy.sh
#   ./scripts/deploy.sh --dry-run --skip-pull

readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_VERSION="2.0.0"

REPO_DIR="${REPO_DIR:-/var/www/bestcityspots}"
if [[ -z "${COMPOSE_PROJECT_DIR+x}" ]]; then
  COMPOSE_PROJECT_DIR="$REPO_DIR"
  COMPOSE_PROJECT_DIR_WAS_DEFAULT=1
else
  COMPOSE_PROJECT_DIR="${COMPOSE_PROJECT_DIR:-$REPO_DIR}"
  COMPOSE_PROJECT_DIR_WAS_DEFAULT=0
fi
if [[ -z "${COMPOSE_FILE+x}" ]]; then
  COMPOSE_FILE="$COMPOSE_PROJECT_DIR/docker-compose.yml"
  COMPOSE_FILE_WAS_DEFAULT=1
else
  COMPOSE_FILE="${COMPOSE_FILE:-$COMPOSE_PROJECT_DIR/docker-compose.yml}"
  COMPOSE_FILE_WAS_DEFAULT=0
fi
COMPOSE_SERVICE="${COMPOSE_SERVICE:-web}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-}"
# Optional external Docker network (e.g. for a shared reverse proxy).
# Empty by default — set DOCKER_NETWORK=web (or pass --network web) only if a
# reverse-proxy stack expects to reach this container on a shared bridge.
DOCKER_NETWORK="${DOCKER_NETWORK:-}"
DOCKER_IMAGE="${DOCKER_IMAGE:-bestcityspots:latest}"

GIT_REMOTE="${GIT_REMOTE:-origin}"
GIT_BRANCH="${GIT_BRANCH:-main}"
GIT_REMOTE_URL="${GIT_REMOTE_URL:-}"
GIT_SSH_KEY="${GIT_SSH_KEY:-}"

DEPLOY_DRY_RUN="${DEPLOY_DRY_RUN:-0}"
DEPLOY_SKIP_PULL="${DEPLOY_SKIP_PULL:-0}"
DEPLOY_SKIP_ENV_CHECK="${DEPLOY_SKIP_ENV_CHECK:-0}"
DEPLOY_SKIP_HEALTH_CHECK="${DEPLOY_SKIP_HEALTH_CHECK:-0}"
DEPLOY_SKIP_ROLLBACK="${DEPLOY_SKIP_ROLLBACK:-0}"
DEPLOY_REQUIRE_CLEAN_TREE="${DEPLOY_REQUIRE_CLEAN_TREE:-1}"
DEPLOY_CREATE_NETWORK="${DEPLOY_CREATE_NETWORK:-0}"
DEPLOY_PRUNE_IMAGES="${DEPLOY_PRUNE_IMAGES:-0}"
DEPLOY_RUN_LOCAL_CHECKS="${DEPLOY_RUN_LOCAL_CHECKS:-0}"
DEPLOY_HEALTH_URL="${DEPLOY_HEALTH_URL:-http://127.0.0.1:3000/}"
DEPLOY_HEALTH_TIMEOUT_SECONDS="${DEPLOY_HEALTH_TIMEOUT_SECONDS:-90}"
DEPLOY_HEALTH_INTERVAL_SECONDS="${DEPLOY_HEALTH_INTERVAL_SECONDS:-5}"

REQUIRED_ENV_VARS="${REQUIRED_ENV_VARS:-NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY SUPABASE_SECRET_KEY GOOGLE_PLACES_API_KEY}"

PREVIOUS_IMAGE_TAG=""
DEPLOY_STARTED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

usage() {
  cat <<EOF
$SCRIPT_NAME v$SCRIPT_VERSION

Usage:
  $SCRIPT_NAME [options]

Options:
  --repo-dir PATH          Git working tree to deploy. Default: $REPO_DIR
  --compose-file PATH      Compose file path. Default: $COMPOSE_FILE
  --compose-env-file PATH  Env file for Compose interpolation and container env.
  --service NAME           Compose service to deploy/check. Default: $COMPOSE_SERVICE
  --branch NAME            Git branch to deploy. Default: $GIT_BRANCH
  --remote NAME            Git remote to fetch from. Default: $GIT_REMOTE
  --remote-url URL         Fetch from an explicit URL instead of a named remote.
  --network NAME           External Docker network to connect the service to.
  --no-network             Do not connect the service to an external Docker network.
  --health-url URL         URL to poll after deploy. Default: $DEPLOY_HEALTH_URL
  --skip-pull              Do not fetch or update git.
  --skip-env-check         Do not require build-time env vars.
  --skip-health-check      Do not poll the health URL.
  --skip-rollback          Do not restore the previous image on health failure.
  --run-local-checks       Run npm lint and type-check before Docker build.
  --prune-images           Prune dangling Docker images after success.
  --dry-run                Print commands without executing them.
  -h, --help               Show this help.

Environment:
  REPO_DIR, COMPOSE_PROJECT_DIR, COMPOSE_FILE, COMPOSE_SERVICE, COMPOSE_ENV_FILE
  GIT_REMOTE, GIT_BRANCH, GIT_REMOTE_URL, GIT_SSH_KEY
  DEPLOY_HEALTH_URL, REQUIRED_ENV_VARS, DEPLOY_* flags
EOF
}

log() {
  printf '[%s] %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*"
}

warn() {
  printf '[%s] WARNING: %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*" >&2
}

die() {
  printf '[%s] ERROR: %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*" >&2
  exit 1
}

on_error() {
  local exit_code=$?
  warn "Deployment failed at line ${BASH_LINENO[0]} with exit code $exit_code."
  exit "$exit_code"
}

trap on_error ERR

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --repo-dir)
        REPO_DIR="${2:?Missing value for --repo-dir}"
        shift 2
        ;;
      --compose-file)
        COMPOSE_FILE="${2:?Missing value for --compose-file}"
        shift 2
        ;;
      --compose-env-file)
        COMPOSE_ENV_FILE="${2:?Missing value for --compose-env-file}"
        shift 2
        ;;
      --service)
        COMPOSE_SERVICE="${2:?Missing value for --service}"
        shift 2
        ;;
      --branch)
        GIT_BRANCH="${2:?Missing value for --branch}"
        shift 2
        ;;
      --remote)
        GIT_REMOTE="${2:?Missing value for --remote}"
        shift 2
        ;;
      --remote-url)
        GIT_REMOTE_URL="${2:?Missing value for --remote-url}"
        shift 2
        ;;
      --network)
        DOCKER_NETWORK="${2:?Missing value for --network}"
        shift 2
        ;;
      --no-network)
        DOCKER_NETWORK=""
        shift
        ;;
      --health-url)
        DEPLOY_HEALTH_URL="${2:?Missing value for --health-url}"
        shift 2
        ;;
      --skip-pull)
        DEPLOY_SKIP_PULL=1
        shift
        ;;
      --skip-env-check)
        DEPLOY_SKIP_ENV_CHECK=1
        shift
        ;;
      --skip-health-check)
        DEPLOY_SKIP_HEALTH_CHECK=1
        shift
        ;;
      --skip-rollback)
        DEPLOY_SKIP_ROLLBACK=1
        shift
        ;;
      --run-local-checks)
        DEPLOY_RUN_LOCAL_CHECKS=1
        shift
        ;;
      --prune-images)
        DEPLOY_PRUNE_IMAGES=1
        shift
        ;;
      --dry-run)
        DEPLOY_DRY_RUN=1
        shift
        ;;
      -h | --help)
        usage
        exit 0
        ;;
      *)
        die "Unknown option: $1"
        ;;
    esac
  done
}

normalize_defaults() {
  if [[ "$COMPOSE_PROJECT_DIR_WAS_DEFAULT" == "1" ]]; then
    COMPOSE_PROJECT_DIR="$REPO_DIR"
  fi

  if [[ "$COMPOSE_FILE_WAS_DEFAULT" == "1" ]]; then
    COMPOSE_FILE="$COMPOSE_PROJECT_DIR/docker-compose.yml"
  fi
}

run() {
  if [[ "$DEPLOY_DRY_RUN" == "1" ]]; then
    printf '+ '
    printf '%q ' "$@"
    printf '\n'
    return 0
  fi

  "$@"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

resolve_env_file() {
  if [[ -n "$COMPOSE_ENV_FILE" ]]; then
    return 0
  fi

  if [[ -f "$COMPOSE_PROJECT_DIR/.env.production" ]]; then
    COMPOSE_ENV_FILE="$COMPOSE_PROJECT_DIR/.env.production"
  elif [[ -f "$COMPOSE_PROJECT_DIR/.env" ]]; then
    COMPOSE_ENV_FILE="$COMPOSE_PROJECT_DIR/.env"
  fi
}

load_env_file() {
  if [[ -z "$COMPOSE_ENV_FILE" ]]; then
    warn "No Compose env file found. Compose variable interpolation will use the current shell environment only."
    return 0
  fi

  [[ -f "$COMPOSE_ENV_FILE" ]] || die "Compose env file does not exist: $COMPOSE_ENV_FILE"
  log "Loading deployment env from $COMPOSE_ENV_FILE"
  set -a
  # shellcheck source=/dev/null
  source "$COMPOSE_ENV_FILE"
  set +a
}

compose_args() {
  local args=(compose --project-directory "$COMPOSE_PROJECT_DIR" -f "$COMPOSE_FILE")

  if [[ -n "$COMPOSE_PROJECT_NAME" ]]; then
    args=(compose -p "$COMPOSE_PROJECT_NAME" --project-directory "$COMPOSE_PROJECT_DIR" -f "$COMPOSE_FILE")
  fi

  if [[ -n "$COMPOSE_ENV_FILE" ]]; then
    args+=(--env-file "$COMPOSE_ENV_FILE")
  fi

  printf '%s\0' "${args[@]}"
}

docker_compose() {
  local args=()
  while IFS= read -r -d '' arg; do
    args+=("$arg")
  done < <(compose_args)

  run docker "${args[@]}" "$@"
}

docker_compose_capture() {
  local args=()
  while IFS= read -r -d '' arg; do
    args+=("$arg")
  done < <(compose_args)

  docker "${args[@]}" "$@"
}

validate_paths() {
  [[ -d "$REPO_DIR" ]] || die "Repository directory does not exist: $REPO_DIR"
  [[ -f "$COMPOSE_FILE" ]] || die "Compose file does not exist: $COMPOSE_FILE"
}

validate_environment() {
  if [[ "$DEPLOY_SKIP_ENV_CHECK" == "1" ]]; then
    warn "Skipping required environment checks."
    return 0
  fi

  local missing=()
  local env_var
  for env_var in $REQUIRED_ENV_VARS; do
    if [[ -z "${!env_var:-}" ]]; then
      missing+=("$env_var")
    fi
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    die "Missing required environment variable(s): ${missing[*]}. Set them in $COMPOSE_ENV_FILE or export them before deploy."
  fi
}

configure_git_ssh() {
  if [[ -z "$GIT_SSH_KEY" ]]; then
    return 0
  fi

  [[ -f "$GIT_SSH_KEY" ]] || die "GIT_SSH_KEY does not exist: $GIT_SSH_KEY"
  export GIT_SSH_COMMAND="ssh -i '$GIT_SSH_KEY' -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"
}

ensure_clean_tree() {
  if [[ "$DEPLOY_REQUIRE_CLEAN_TREE" != "1" ]]; then
    return 0
  fi

  if ! git diff --quiet || ! git diff --cached --quiet; then
    die "Git working tree has uncommitted changes. Commit/stash them or set DEPLOY_REQUIRE_CLEAN_TREE=0."
  fi
}

update_source() {
  if [[ "$DEPLOY_SKIP_PULL" == "1" ]]; then
    warn "Skipping git update."
    return 0
  fi

  log "Updating $GIT_BRANCH from ${GIT_REMOTE_URL:-$GIT_REMOTE}"
  ensure_clean_tree

  local before_revision
  before_revision="$(git rev-parse --short HEAD)"

  if [[ -n "$GIT_REMOTE_URL" ]]; then
    run git fetch --prune "$GIT_REMOTE_URL" "$GIT_BRANCH"
    run git merge --ff-only FETCH_HEAD
  else
    run git fetch --prune "$GIT_REMOTE" "$GIT_BRANCH"
    run git checkout "$GIT_BRANCH"
    run git merge --ff-only "$GIT_REMOTE/$GIT_BRANCH"
  fi

  local after_revision
  after_revision="$(git rev-parse --short HEAD)"
  log "Source revision: $before_revision -> $after_revision"
}

run_local_checks() {
  if [[ "$DEPLOY_RUN_LOCAL_CHECKS" != "1" ]]; then
    return 0
  fi

  if [[ "$DEPLOY_DRY_RUN" != "1" ]]; then
    require_command npm
  fi

  log "Running local quality gates."
  run npm run lint
  run npm run type-check
}

capture_previous_image() {
  if [[ "$DEPLOY_DRY_RUN" == "1" ]]; then
    PREVIOUS_IMAGE_TAG="${DOCKER_IMAGE%:*}:rollback-dry-run"
    run docker tag "$DOCKER_IMAGE" "$PREVIOUS_IMAGE_TAG"
    return 0
  fi

  if ! docker image inspect "$DOCKER_IMAGE" >/dev/null 2>&1; then
    warn "No existing $DOCKER_IMAGE image found for rollback."
    return 0
  fi

  PREVIOUS_IMAGE_TAG="${DOCKER_IMAGE%:*}:rollback-$(date -u +"%Y%m%dT%H%M%SZ")"
  log "Tagging current image for rollback: $PREVIOUS_IMAGE_TAG"
  run docker tag "$DOCKER_IMAGE" "$PREVIOUS_IMAGE_TAG"
}

deploy_compose() {
  log "Building and starting $COMPOSE_SERVICE with Docker Compose."
  docker_compose up -d --build --remove-orphans "$COMPOSE_SERVICE"
}

connect_network() {
  if [[ -z "$DOCKER_NETWORK" ]]; then
    return 0
  fi

  if [[ "$DEPLOY_DRY_RUN" == "1" ]]; then
    run docker network inspect "$DOCKER_NETWORK"
    run docker network connect "$DOCKER_NETWORK" "<${COMPOSE_SERVICE}-container-id>"
    return 0
  fi

  if ! docker network inspect "$DOCKER_NETWORK" >/dev/null 2>&1; then
    if [[ "$DEPLOY_CREATE_NETWORK" == "1" ]]; then
      log "Creating Docker network: $DOCKER_NETWORK"
      run docker network create "$DOCKER_NETWORK"
    else
      warn "Docker network '$DOCKER_NETWORK' does not exist. Set DEPLOY_CREATE_NETWORK=1 to create it."
      return 0
    fi
  fi

  local container_id
  container_id="$(docker_compose_capture ps -q "$COMPOSE_SERVICE")"
  if [[ -z "$container_id" ]]; then
    warn "No container found for service '$COMPOSE_SERVICE'."
    return 0
  fi

  if docker inspect "$container_id" --format '{{json .NetworkSettings.Networks}}' | grep -q "\"$DOCKER_NETWORK\""; then
    log "Service container is already connected to network: $DOCKER_NETWORK"
    return 0
  fi

  log "Connecting service container to Docker network: $DOCKER_NETWORK"
  run docker network connect "$DOCKER_NETWORK" "$container_id"
}

wait_for_health() {
  if [[ "$DEPLOY_DRY_RUN" == "1" ]]; then
    log "Dry run: skipping health check for $DEPLOY_HEALTH_URL"
    return 0
  fi

  if [[ "$DEPLOY_SKIP_HEALTH_CHECK" == "1" ]]; then
    warn "Skipping health check."
    return 0
  fi

  require_command curl

  local deadline
  deadline=$((SECONDS + DEPLOY_HEALTH_TIMEOUT_SECONDS))

  log "Waiting for healthy response from $DEPLOY_HEALTH_URL"
  while (( SECONDS < deadline )); do
    if curl --fail --silent --show-error --max-time 10 "$DEPLOY_HEALTH_URL" >/dev/null; then
      log "Health check passed."
      return 0
    fi

    sleep "$DEPLOY_HEALTH_INTERVAL_SECONDS"
  done

  return 1
}

rollback() {
  if [[ "$DEPLOY_SKIP_ROLLBACK" == "1" ]]; then
    warn "Rollback skipped by configuration."
    return 1
  fi

  if [[ -z "$PREVIOUS_IMAGE_TAG" ]]; then
    warn "No rollback image is available."
    return 1
  fi

  warn "Health check failed. Restoring previous image: $PREVIOUS_IMAGE_TAG"
  run docker tag "$PREVIOUS_IMAGE_TAG" "$DOCKER_IMAGE"
  docker_compose up -d --no-build --force-recreate --remove-orphans "$COMPOSE_SERVICE"
  connect_network
  return 1
}

prune_images() {
  if [[ "$DEPLOY_PRUNE_IMAGES" != "1" ]]; then
    return 0
  fi

  log "Pruning dangling Docker images."
  run docker image prune -f
}

print_summary() {
  local revision="unknown"
  if git rev-parse --short HEAD >/dev/null 2>&1; then
    revision="$(git rev-parse --short HEAD)"
  fi

  log "Deployment complete."
  log "Started: $DEPLOY_STARTED_AT"
  log "Revision: $revision"
  log "Service: $COMPOSE_SERVICE"
  log "Health URL: $DEPLOY_HEALTH_URL"
}

main() {
  parse_args "$@"
  normalize_defaults
  validate_paths
  cd "$REPO_DIR"

  require_command git
  if [[ "$DEPLOY_DRY_RUN" != "1" ]]; then
    require_command docker
    docker compose version >/dev/null 2>&1 || die "Docker Compose v2 plugin is required."
  fi

  resolve_env_file
  load_env_file
  validate_environment
  configure_git_ssh

  log "$SCRIPT_NAME v$SCRIPT_VERSION starting."
  log "Repository: $REPO_DIR"
  log "Compose file: $COMPOSE_FILE"

  update_source
  run_local_checks
  capture_previous_image
  deploy_compose
  connect_network

  if ! wait_for_health; then
    rollback
    die "Deployment health check failed: $DEPLOY_HEALTH_URL"
  fi

  prune_images
  print_summary
}

main "$@"