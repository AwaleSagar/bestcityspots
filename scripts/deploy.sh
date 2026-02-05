#!/usr/bin/env bash
set -e

# --- Configuration & Defaults ---
REPO_DIR="${REPO_DIR:-/var/www/bestcityspots}"
COMPOSE_PROJECT_DIR="${COMPOSE_PROJECT_DIR:-$REPO_DIR}"
COMPOSE_SERVICE="${COMPOSE_SERVICE:-web}"
DOCKER_NETWORK="${DOCKER_NETWORK:-web}"
GIT_REMOTE="${GIT_REMOTE:-origin}"
GIT_BRANCH="${GIT_BRANCH:-main}"
GIT_REMOTE_URL="${GIT_REMOTE_URL:-}"
GIT_SSH_KEY="${GIT_SSH_KEY:-}"

# --- Colors for Output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# --- Helper Functions ---
log_info() {
    echo -e "${BLUE}[INFO] $(date +'%H:%M:%S') > $1${NC}"
}
log_success() {
    echo -e "${GREEN}[SUCCESS] $(date +'%H:%M:%S') > $1${NC}"
}
log_warn() {
    echo -e "${YELLOW}[WARN] $(date +'%H:%M:%S') > $1${NC}"
}
log_error() {
    echo -e "${RED}[ERROR] $(date +'%H:%M:%S') > $1${NC}"
}
fail() {
    log_error "$1"
    exit 1
}

# --- Error Handling ---
cleanup() {
    if [ $? -ne 0 ]; then
        log_error "Deployment failed unexpectedly!"
    fi
}
trap cleanup EXIT

# --- Start Deployment ---
start_time=$SECONDS
log_info "Starting deployment for branch: ${GIT_BRANCH}"

# 1. Check Directory
if [ -d "$REPO_DIR" ]; then
    log_info "Navigating to repository: $REPO_DIR"
    cd "$REPO_DIR"
else
    fail "Repository directory not found at $REPO_DIR"
fi

# 2. Production Environment Guard
if [[ "${DEPLOY_ENV:-}" != "production" ]]; then
    log_warn "DEPLOY_ENV is not set to 'production'."
    echo "This script performs destructive actions (git pull, build, restart)."
    read -p "Are you sure you want to proceed? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        fail "Deployment aborted. Set DEPLOY_ENV=production to skip this prompt."
    fi
fi

# 3. Git Status Check (Local Safety)
if [[ -n $(git status --porcelain) ]]; then
    log_warn "Uncommitted changes detected!"
    git status --short
    read -p "Continue with dirty state? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        fail "Deployment aborted due to uncommitted changes."
    fi
fi

# 3. Pull Latest Code
log_info "Pulling latest code..."
if [[ -n "$GIT_SSH_KEY" ]]; then
    log_info "Using custom SSH key."
    export GIT_SSH_COMMAND="ssh -i \"$GIT_SSH_KEY\" -o IdentitiesOnly=yes"
fi

if [[ -n "$GIT_REMOTE_URL" ]]; then
    git pull "$GIT_REMOTE_URL" "$GIT_BRANCH" || fail "Git pull failed from URL."
else
    git pull "$GIT_REMOTE" "$GIT_BRANCH" || fail "Git pull failed."
fi

# 4. Code Quality Checks
log_info "Running code quality checks..."
log_info "1/3: Installing dependencies..."
npm ci --silent || fail "npm install failed."

log_info "2/3: Linting..."
npm run lint || fail "Linting check failed."

log_info "3/3: Type Checking..."
npm run type-check || fail "TypeScript check failed."

# 5. Build Application
log_info "Building production application..."
npm run build || fail "Production build failed."

# 6. Docker Deployment
log_info "Deploying with Docker Compose..."
docker compose -f "$COMPOSE_PROJECT_DIR/docker-compose.yml" up -d --build --remove-orphans || fail "Docker Compose failed."

# 7. Network Connectivity
log_info "Ensuring container is connected to network: $DOCKER_NETWORK"
container_id="$(docker compose -f "$COMPOSE_PROJECT_DIR/docker-compose.yml" ps -q "$COMPOSE_SERVICE")"

if [[ -n "$container_id" ]]; then
    if ! docker network inspect "$DOCKER_NETWORK" >/dev/null 2>&1; then
        log_warn "Network '$DOCKER_NETWORK' does not exist. Creating it..."
        docker network create "$DOCKER_NETWORK"
    fi
    docker network connect "$DOCKER_NETWORK" "$container_id" >/dev/null 2>&1 || true
    log_success "Container connected to network."
else
    log_warn "No container found for service '$COMPOSE_SERVICE'. Skipping network connection."
fi

# --- Completion ---
duration=$(( SECONDS - start_time ))
log_success "Deployment completed successfully in ${duration}s."
