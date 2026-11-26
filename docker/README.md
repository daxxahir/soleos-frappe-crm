# Soleos Frappe Docker Setup (Production / 24×7)

This directory packages the full **Soleos Frappe v16** stack (`frappe`, `erpnext`, `hrms`, `payments`, `india_compliance`, `builder`, `crm`, `insights`, `helpdesk`, `telephony`, `offsite_backups`, `blog`, `lms`, and your custom `soleos` app) into production Docker containers based on `frappe_docker`.

## Architecture

- **Custom image (`docker/Containerfile`):** Builds Python 3.14 + Node 24 + `wkhtmltopdf` + headless Chromium + Nginx + all 12 pinned upstream apps from `docker/apps.json` (`frappe` `v16.52.0`, `lms` `v16.1.1`, etc.) plus your local `frappe-bench/apps/soleos` snapshot.
- **Services (`docker/compose.yaml` + `docker/overrides/`):**
  - `backend`: Gunicorn WSGI server (`--preload`, configurable workers/threads)
  - `frontend`: Nginx serving static `/assets` directly and proxying dynamic + `/socket.io` requests
  - `websocket`: Node `socketio.js`
  - `queue-short` / `queue-long`: RQ background workers
  - `scheduler`: Frappe scheduler
  - `configurator`: Writes `sites/apps.txt` and `sites/common_site_config.json`
  - `db`: MariaDB 11.8 (`overrides/compose.mariadb.yaml`)
  - `redis-cache` & `redis-queue`: Redis 8.6 (`overrides/compose.redis.yaml`)
  - `migrator`: Runs `bench --site all migrate` automatically on startup (`overrides/compose.migrator.yaml`)
  - `cron`: Automated site backups every 6 hours (`overrides/compose.backup-cron.yaml`)

## Quick Start (Local / LAN on port 8080)

1. Copy `.env.example` to `.env` (already initialized in `docker/.env` with local defaults) and update `DB_PASSWORD`:
   ```bash
   cd /home/soleos/docker
   cp -n .env.example .env
   ```
2. Build the custom image and start the stack:
   ```bash
   docker compose build
   docker compose up -d
   ```
3. Either migrate your existing local WSL site into Docker:
   ```bash
   ./scripts/sync-from-local-bench.sh soleos.localhost
   ```
   Or create a fresh site:
   ```bash
   ./scripts/create-site.sh soleos.localhost your-admin-password
   ```
4. Open `http://localhost:8080` (or `/crm`, `/lms`, `/app`).

## Production Server Deployment (with HTTPS via Traefik)

1. Copy the repository (including `docker/` and `frappe-bench/apps/soleos/`) to your Linux server with Docker & Compose v2 installed.
2. Edit `docker/.env`:
   - Set a strong `DB_PASSWORD`
   - Set `FRAPPE_SITE_NAME_HEADER=$$host` and `DEFAULT_SITE=crm.yourdomain.com`
   - Set `LETSENCRYPT_EMAIL=admin@yourdomain.com`
   - Set `SITES_RULE=Host(\`crm.yourdomain.com\`)`
   - Set `TRUST_UPSTREAM_FORWARDED_PROTO=on`
   - Replace `overrides/compose.noproxy.yaml` with `overrides/compose.https.yaml` in `COMPOSE_FILE`
   - Set `HTTP_PUBLISH_PORT=80` and `HTTPS_PUBLISH_PORT=443`
3. Build and start:
   ```bash
   cd docker
   docker compose build
   docker compose up -d
   ```
4. Restore your backup or create the production site matching your domain (`crm.yourdomain.com`).

## Updating `soleos` or Apps

After changing code in `frappe-bench/apps/soleos` or versions in `docker/apps.json`:
```bash
cd /home/soleos/docker
docker compose build
docker compose up -d
```
The `migrator` service will automatically run `bench --site all migrate` when containers restart.
