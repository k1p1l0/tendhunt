#!/usr/bin/env bash
# Get full context from Graphiti for a task
# Usage: graphiti-context.sh "task description"
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TASK="${1:?Usage: graphiti-context.sh \"task description\"}"

echo "=== Shared Knowledge ==="
"$SCRIPT_DIR/graphiti-search.sh" "$TASK" "tendhunt" 10

echo ""
echo "=== User Context ==="
"$SCRIPT_DIR/graphiti-search.sh" "user preferences interests sectors regions" "tendhunt" 5
