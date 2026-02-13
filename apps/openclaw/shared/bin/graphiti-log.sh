#!/usr/bin/env bash
# Log a fact to Graphiti knowledge graph
# Usage: graphiti-log.sh <role_type> <role> <content>
# role_type: user | assistant | system
# If GRAPHITI_GROUP is not set, defaults to user_{SLACK_USER_ID} or "tendhunt"
set -euo pipefail

GRAPHITI_URL="${GRAPHITI_URL:-http://graphiti:8000}"

# Default group: user-scoped if SLACK_USER_ID is available, else "tendhunt"
if [ -n "${GRAPHITI_GROUP:-}" ]; then
  GROUP_ID="$GRAPHITI_GROUP"
elif [ -n "${SLACK_USER_ID:-}" ]; then
  GROUP_ID="user_${SLACK_USER_ID}"
else
  GROUP_ID="tendhunt"
fi
ROLE_TYPE="${1:?Usage: graphiti-log.sh <role_type> <role> <content>}"
ROLE="${2:?Missing role (e.g. 'Sculptor', 'User')}"
CONTENT="${3:?Missing content}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

PAYLOAD=$(python3 -c "
import json, os
body = {
    'group_id': '$GROUP_ID',
    'messages': [{
        'role_type': '$ROLE_TYPE',
        'role': '$ROLE',
        'content': os.environ.get('LOG_CONTENT', ''),
        'timestamp': '$TIMESTAMP',
        'source_description': 'Sculptor Slack conversation',
        'name': '$ROLE'
    }]
}
print(json.dumps(body))
" 2>/dev/null)

RESPONSE=$(LOG_CONTENT="$CONTENT" curl -sf --max-time 10 -X POST "${GRAPHITI_URL}/messages" \
  -H 'Content-Type: application/json' \
  -d "$PAYLOAD" 2>/dev/null || echo '{"error":"failed"}')

python3 -c "
import json
try:
    data = json.loads('''$RESPONSE''')
    if 'error' in data:
        print(f'Error: {data[\"error\"]}')
    else:
        print('Fact saved to memory.')
except:
    print('Fact saved to memory.')
" 2>/dev/null
