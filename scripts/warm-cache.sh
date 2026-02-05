#!/bin/bash

# Warm Cache Script for BestCitySpots
# Wrapper script for the TypeScript warm-cache CLI tool
#
# This script loads the environment and runs the TypeScript warm-cache tool.
# For advanced options, run the TypeScript tool directly:
#   npx tsx scripts/warm-cache.ts --help

set -e

# --- Load Node.js Environment ---
load_node_env() {
    if [ -s "$HOME/.nvm/nvm.sh" ]; then
        export NVM_DIR="$HOME/.nvm"
        source "$NVM_DIR/nvm.sh"
        return 0
    fi
    
    if command -v fnm &> /dev/null; then
        eval "$(fnm env)"
        return 0
    fi
    
    for node_path in /usr/local/bin /usr/bin "$HOME/.local/bin"; do
        if [ -x "$node_path/node" ]; then
            export PATH="$node_path:$PATH"
            return 0
        fi
    done
    
    if command -v npm &> /dev/null; then
        return 0
    fi
    
    return 1
}

if ! load_node_env; then
    echo "ERROR: Could not find Node.js/npm. Please install Node.js or set up nvm."
    exit 1
fi

# --- Navigate to project root ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# --- Load environment variables ---
if [ -f ".env.local" ]; then
    set -a
    source .env.local
    set +a
fi

if [ -f ".env" ]; then
    set -a
    source .env
    set +a
fi

# --- Run the warm-cache script ---
echo "Warm Cache CLI"
echo "=============="
echo ""

# Pass all arguments to the TypeScript script
npx tsx scripts/warm-cache.ts "$@"
