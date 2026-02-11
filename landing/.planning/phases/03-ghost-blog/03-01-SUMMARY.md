# Plan 03-01 Summary: VPS Setup + Ghost Installation

**Completed:** 2026-02-11
**Status:** Done

## What Was Built

Production Ghost 6.18.0 instance on Hetzner VPS with full SSL, MySQL, NGINX reverse proxy, and systemd service management.

## Infrastructure Details

| Component | Detail |
|-----------|--------|
| **VPS** | Hetzner CX23, Helsinki datacenter |
| **VPS IP** | `89.167.64.44` |
| **OS** | Ubuntu 24.04 LTS |
| **SSH** | `ssh root@89.167.64.44` (key-based auth) |
| **Monthly Cost** | €2.99 + €0.50 IPv4 = €3.49/mo |

## Software Versions

| Software | Version |
|----------|---------|
| Ghost | 6.18.0 |
| Node.js | 22.22.0 |
| MySQL | 8.0.45 |
| NGINX | 1.24.0 |
| Ghost CLI | 1.28.4 |

## Configuration Paths

| File | Path |
|------|------|
| Ghost installation | `/var/www/ghost/` |
| Ghost config | `/var/www/ghost/config.production.json` |
| NGINX HTTP config | `/etc/nginx/sites-available/ghost-admin.tendhunt.com.conf` |
| NGINX SSL config | `/etc/nginx/sites-available/ghost-admin.tendhunt.com-ssl.conf` |
| SSL certificate | `/etc/letsencrypt/ghost-admin.tendhunt.com/fullchain.cer` |
| SSL key | `/etc/letsencrypt/ghost-admin.tendhunt.com/ghost-admin.tendhunt.com.key` |
| Systemd service | `ghost_ghost-admin-tendhunt-com` |
| MySQL credentials | `/root/.ghost_db_pass` |

## Access Points

| URL | Purpose | Status |
|-----|---------|--------|
| `https://ghost-admin.tendhunt.com` | Ghost homepage | 200 OK |
| `https://ghost-admin.tendhunt.com/ghost/` | Admin panel | 200 OK |
| `https://ghost-admin.tendhunt.com/rss/` | RSS feed | 200 OK |

## SSL Certificate

- **Issuer:** Let's Encrypt R12
- **Valid:** Feb 11 2026 → May 12 2026
- **Auto-renewal:** Yes (via acme.sh cron)

## DNS

- A record: `ghost-admin.tendhunt.com` → `89.167.64.44` (DNS Only, CF proxy OFF)

## Deviations from Plan

1. **Ghost 6.18.0 instead of 5.x** — Ghost CLI installed latest stable (v6). This is fine; Ghost 6.x is backwards compatible and adds ActivityPub/Fediverse support.
2. **CX23 instead of CX22** — User chose CX23 (4GB RAM, €2.99/mo) which is actually cheaper than the planned CX22.
3. **Helsinki datacenter** — Plan suggested Falkenstein/Nuremberg for UK latency; user chose Helsinki. Acceptable with Cloudflare proxy in front.

## System User

- Ghost runs as `ghost_user` (system user, sudo NOPASSWD)
- Ghost service managed via `ghost` CLI commands as `ghost_user`

## Next Steps

- [ ] Create Ghost admin account (first visit to `/ghost/` shows setup wizard)
- [ ] Plan 03-02: Custom Ghost theme matching TendHunt landing design
- [ ] Plan 03-03: Cloudflare Worker reverse proxy for `/blog/*` routing
