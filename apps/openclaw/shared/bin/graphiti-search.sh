#!/usr/bin/env bash
# Search Graphiti knowledge graph for facts
# Usage: graphiti-search.sh "query" [group_id] [max_facts]
set -euo pipefail

GRAPHITI_URL="${GRAPHITI_URL:-http://graphiti:8000}"
QUERY="${1:?Usage: graphiti-search.sh \"query\" [group_id] [max_facts]}"
GROUP_ID="${2:-tendhunt}"
MAX_FACTS="${3:-10}"

PAYLOAD=$(python3 -c "
import json
print(json.dumps({'query': '$QUERY', 'group_ids': ['$GROUP_ID'], 'max_facts': $MAX_FACTS}))
")

RESPONSE=$(curl -sf --max-time 10 -X POST "${GRAPHITI_URL}/search" \
  -H 'Content-Type: application/json' \
  -d "$PAYLOAD" 2>/dev/null || echo '{"facts":[]}')

python3 -c "
import json, sys
try:
    data = json.loads('''$RESPONSE''')
    facts = data if isinstance(data, list) else data.get('facts', data.get('results', []))
    if not facts:
        print('No facts found for: $QUERY')
    else:
        for f in facts:
            text = f.get('fact', f.get('name', f.get('content', '')))
            valid = f.get('valid_at', '')
            if text:
                suffix = f' (as of {valid})' if valid else ''
                print(f'• {text}{suffix}')
except Exception:
    print('No facts found for: $QUERY')
" 2>/dev/null
