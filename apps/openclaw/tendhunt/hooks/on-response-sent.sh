#!/bin/bash
# Post-response hook: saves conversation to Graphiti memory.
# Env: SLACK_USER_ID, USER_MESSAGE, ASSISTANT_RESPONSE, GRAPHITI_URL (default http://graphiti:8000)
# Runs fire-and-forget; errors are silently ignored.

GRAPHITI_URL="${GRAPHITI_URL:-http://graphiti:8000}"
GROUP_ID="tendhunt"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Build a safe JSON body using python3 to handle all escaping
json_body=$(python3 -c "
import json, os, sys

user_id = os.environ.get('SLACK_USER_ID', 'unknown')
user_msg = os.environ.get('USER_MESSAGE', '')
assistant_msg = os.environ.get('ASSISTANT_RESPONSE', '')
group_id = '${GROUP_ID}'
ts = '${TIMESTAMP}'

body = {
    'group_id': group_id,
    'messages': [
        {
            'role_type': 'user',
            'role': f'slack_user_{user_id}',
            'content': user_msg,
            'timestamp': ts,
            'source_description': f'Slack conversation with user {user_id}',
            'name': f'slack_user_{user_id}'
        },
        {
            'role_type': 'assistant',
            'role': 'tendhunt_assistant',
            'content': assistant_msg,
            'timestamp': ts,
            'source_description': f'Slack conversation with user {user_id}',
            'name': 'tendhunt_assistant'
        }
    ]
}

print(json.dumps(body))
" 2>/dev/null)

if [ -z "$json_body" ]; then
  exit 0
fi

curl -sf --max-time 10 -X POST "${GRAPHITI_URL}/messages" \
  -H "Content-Type: application/json" \
  -d "$json_body" \
  >/dev/null 2>&1

# Sync conversation to TendHunt web app
TENDHUNT_API_URL="${TENDHUNT_API_URL:-https://app.tendhunt.com}"
TENDHUNT_API_KEY="${TENDHUNT_API_KEY:-}"

if [ -n "$TENDHUNT_API_KEY" ]; then
  sync_body=$(python3 -c "
import json, os
body = {
    'userMessage': os.environ.get('USER_MESSAGE', ''),
    'assistantResponse': os.environ.get('ASSISTANT_RESPONSE', ''),
    'slackThreadTs': os.environ.get('SLACK_THREAD_TS', ''),
    'slackChannelId': os.environ.get('SLACK_CHANNEL_ID', ''),
}
print(json.dumps(body))
" 2>/dev/null)

  if [ -n "$sync_body" ]; then
    curl -sf --max-time 10 -X POST "${TENDHUNT_API_URL}/api/public/v1/conversations/sync" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${TENDHUNT_API_KEY}" \
      -d "$sync_body" \
      >/dev/null 2>&1
  fi
fi

exit 0
