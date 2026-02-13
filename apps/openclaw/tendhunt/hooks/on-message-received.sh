#!/bin/bash
# Pre-message hook: queries Graphiti for user context before Sculptor responds.
# Env: SLACK_USER_ID, MESSAGE_TEXT, GRAPHITI_URL (default http://graphiti:8000)
# Memory is user-scoped: each Slack user gets their own Graphiti group.
# Outputs structured context block to stdout; empty on failure.

GRAPHITI_URL="${GRAPHITI_URL:-http://graphiti:8000}"

# User-scoped memory group: user_{SLACK_USER_ID} for isolation
if [ -n "${SLACK_USER_ID:-}" ]; then
  GROUP_ID="user_${SLACK_USER_ID}"
else
  GROUP_ID="tendhunt"
fi

# Sanitize MESSAGE_TEXT for JSON embedding (escape backslashes, quotes, newlines)
sanitize_json() {
  printf '%s' "$1" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()), end='')" 2>/dev/null || printf '""'
}

SAFE_MESSAGE=$(sanitize_json "${MESSAGE_TEXT}")
SAFE_USER_ID=$(sanitize_json "${SLACK_USER_ID}")

# Search for user-specific facts
user_query=$(python3 -c "
import json, os
uid = os.environ.get('SLACK_USER_ID', 'unknown')
gid = '${GROUP_ID}'
print(json.dumps({'query': f'user {uid} preferences interests sectors regions', 'group_ids': [gid], 'max_facts': 10}))
" 2>/dev/null)

user_facts=$(curl -sf --max-time 5 -X POST "${GRAPHITI_URL}/search" \
  -H "Content-Type: application/json" \
  -d "${user_query:-"{}"}" \
  2>/dev/null)

# Search for topic-related facts from the message
topic_facts=$(curl -sf --max-time 5 -X POST "${GRAPHITI_URL}/search" \
  -H "Content-Type: application/json" \
  -d "{\"query\": ${SAFE_MESSAGE}, \"group_ids\": [\"${GROUP_ID}\"], \"max_facts\": 5}" \
  2>/dev/null)

# Helper: extract facts array into bullet list
extract_facts() {
  local json="$1"
  python3 -c "
import sys, json
try:
    data = json.loads(sys.argv[1])
    facts = data if isinstance(data, list) else data.get('facts', data.get('results', []))
    for f in facts:
        text = f.get('fact', f.get('name', f.get('content', '')))
        if text:
            print(f'- {text}')
except Exception:
    pass
" "$json" 2>/dev/null
}

user_lines=$(extract_facts "$user_facts")
topic_lines=$(extract_facts "$topic_facts")

if [ -n "$user_lines" ] || [ -n "$topic_lines" ]; then
  echo "## Memory Context"
  echo ""
  if [ -n "$user_lines" ]; then
    echo "### User Preferences & History"
    echo "$user_lines"
    echo ""
  fi
  if [ -n "$topic_lines" ]; then
    echo "### Related Knowledge"
    echo "$topic_lines"
    echo ""
  fi
fi
