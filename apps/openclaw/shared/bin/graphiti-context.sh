#!/usr/bin/env bash
# Get full context from Graphiti for a task
# Usage: graphiti-context.sh "task description" [group_id]
# If group_id is omitted, uses user-scoped group (same as graphiti-search.sh)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TASK="${1:?Usage: graphiti-context.sh \"task description\" [group_id]}"
GROUP_ARG="${2:-}"

echo "=== Shared Knowledge ==="
if [ -n "$GROUP_ARG" ]; then
  "$SCRIPT_DIR/graphiti-search.sh" "$TASK" "$GROUP_ARG" 10
else
  # Let graphiti-search.sh pick the default (user-scoped via SLACK_USER_ID)
  "$SCRIPT_DIR/graphiti-search.sh" "$TASK"
fi

echo ""
echo "=== User Context ==="
if [ -n "$GROUP_ARG" ]; then
  "$SCRIPT_DIR/graphiti-search.sh" "user preferences interests sectors regions" "$GROUP_ARG" 5
else
  "$SCRIPT_DIR/graphiti-search.sh" "user preferences interests sectors regions"
fi
