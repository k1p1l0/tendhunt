# TendHunt OpenClaw Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- A Slack workspace where you can create apps
- TendHunt account with API key
- Anthropic API key (BYOK from user's settings)
- OpenAI API key (for Graphiti entity extraction)

## Step 1: Create Slack App

1. Go to https://api.slack.com/apps and click "Create New App"
2. Choose "From scratch", name it "TendHunt", select your workspace
3. Under **OAuth & Permissions**, add bot scopes:
   - `chat:write` — Send messages
   - `channels:read` — List channels
   - `commands` — Slash commands
   - `app_mentions:read` — Respond to @mentions
   - `im:history` — Read DMs
   - `im:write` — Send DMs
4. Under **Socket Mode**, enable it and generate an App-Level Token with `connections:write` scope
5. Install the app to your workspace
6. Copy tokens:
   - **Bot Token** (`xoxb-...`) from OAuth & Permissions
   - **App Token** (`xapp-...`) from Basic Information > App-Level Tokens

## Step 2: Get TendHunt API Key

1. Log into https://app.tendhunt.com/settings
2. Scroll to "API & Integrations"
3. Create a new API key, copy the `th_live_...` value

## Step 3: Configure Environment

```bash
cd apps/openclaw
cp .env.example .env
```

Fill in all values in `.env`.

## Step 4: Deploy

```bash
docker compose up -d
```

This starts:
- **Neo4j** — Graph database for Graphiti memory
- **Graphiti** — Knowledge graph API for persistent memory
- **OpenClaw** — AI agent with TendHunt skill + Slack Socket Mode

## Step 5: Verify

1. Open Slack, DM the TendHunt bot: "Show me NHS buyers in London"
2. Check Docker logs: `docker compose logs -f openclaw`
3. Verify Graphiti: `curl http://localhost:8000/healthz`
4. Neo4j browser: http://localhost:7474

## Updating

```bash
docker compose pull
docker compose up -d
```

Memory persists across restarts via Docker volumes (`neo4j_data`, `openclaw_memory`).

## Troubleshooting

**Bot doesn't respond in Slack:**
- Check SLACK_APP_TOKEN and SLACK_BOT_TOKEN are correct
- Verify Socket Mode is enabled in Slack app settings
- Check logs: `docker compose logs openclaw`

**Memory not persisting:**
- Verify Graphiti is healthy: `curl http://localhost:8000/healthz`
- Check Neo4j: `docker compose logs neo4j`
- Ensure OPENAI_API_KEY is set (Graphiti uses it for entity extraction)

**API errors:**
- Verify TENDHUNT_API_KEY is valid
- Check rate limits (30 req/min for TendHunt API)
