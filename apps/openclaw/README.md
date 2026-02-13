# OpenClaw - TendHunt Skill

[OpenClaw](https://github.com/openclaw/openclaw) integration for TendHunt UK procurement intelligence.

## What This Is

An OpenClaw skill that gives AI agents access to TendHunt's procurement data: buyers, contracts, signals, personnel, spend data, and board documents from the UK public sector.

## Setup

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TENDHUNT_API_KEY` | Yes | - | Your TendHunt API key (`th_live_xxx`) |
| `TENDHUNT_BASE_URL` | No | `https://app.tendhunt.com` | API base URL |

### Quick Start

1. Copy the `tendhunt/` directory into your OpenClaw skills folder
2. Set environment variables:
   ```bash
   export TENDHUNT_API_KEY=th_live_xxxxxxxxxx
   ```
3. Start OpenClaw:
   ```bash
   docker compose up
   ```

### Manual Testing

```bash
export TENDHUNT_API_KEY=th_live_xxxxxxxxxx
python tendhunt/scripts/query.py /api/public/v1/buyers query=NHS limit=5
```

## Skill Structure

```
tendhunt/
  SKILL.md              # Skill definition (loaded by OpenClaw)
  scripts/query.py      # Python query helper
  references/api-docs.md # Full API reference
```
