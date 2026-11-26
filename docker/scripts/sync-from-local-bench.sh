#!/usr/bin/env bash
set -euo pipefail

# Export the local WSL site (database + public/private files) and restore it into the Docker stack.
# Usage: ./scripts/sync-from-local-bench.sh [local-site-name] [target-docker-site-name]

LOCAL_SITE="${1:-soleos.localhost}"
TARGET_SITE="${2:-$LOCAL_SITE}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")"
BENCH_DIR="/home/soleos/frappe-bench"
export PATH="/home/soleos/.local/bin:/home/soleos/.nvm/versions/node/v24.21.0/bin:$PATH"

cd "$DOCKER_DIR"
set -a
# shellcheck disable=SC1091
source .env
set +a

echo "=== 1. Creating backup of local site '${LOCAL_SITE}' (with files) ==="
cd "$BENCH_DIR"
bench --site "$LOCAL_SITE" backup --with-files

BACKUP_DIR="${BENCH_DIR}/sites/${LOCAL_SITE}/private/backups"
DB_BACKUP="$(ls -t "${BACKUP_DIR}"/*-database*.sql.gz | head -n1)"
FILES_PUBLIC="$(ls -t "${BACKUP_DIR}"/*-files*.tar 2>/dev/null | grep -v 'private-files' | head -n1 || true)"
FILES_PRIVATE="$(ls -t "${BACKUP_DIR}"/*-private-files*.tar 2>/dev/null | head -n1 || true)"

echo "Database backup : $DB_BACKUP"
echo "Public files    : ${FILES_PUBLIC:-none}"
echo "Private files   : ${FILES_PRIVATE:-none}"

cd "$DOCKER_DIR"
echo "=== 2. Copying backup artifacts into Docker backend container ==="
docker compose exec -T backend mkdir -p /tmp/site-restore
docker compose cp "$DB_BACKUP" backend:/tmp/site-restore/database.sql.gz
if [ -n "$FILES_PUBLIC" ]; then
  docker compose cp "$FILES_PUBLIC" backend:/tmp/site-restore/files.tar
fi
if [ -n "$FILES_PRIVATE" ]; then
  docker compose cp "$FILES_PRIVATE" backend:/tmp/site-restore/private-files.tar
fi

SITE_CFG="${BENCH_DIR}/sites/${LOCAL_SITE}/site_config.json"
ENCRYPTION_KEY=""
BACKUP_KEY=""
if [ -f "$SITE_CFG" ]; then
  ENCRYPTION_KEY="$(jq -r '.encryption_key // empty' "$SITE_CFG")"
  BACKUP_KEY="$(jq -r '.backup_encryption_key // empty' "$SITE_CFG")"
fi

echo "=== 3. Restoring into Docker site '${TARGET_SITE}' ==="
RESTORE_FLAGS=(
  --mariadb-root-password "${DB_PASSWORD}"
  --mariadb-user-host-login-scope='%'
  --force
)
if [ -n "$BACKUP_KEY" ]; then
  RESTORE_FLAGS+=(--encryption-key "${BACKUP_KEY}")
fi
if [ -n "$FILES_PUBLIC" ]; then
  RESTORE_FLAGS+=(--with-public-files /tmp/site-restore/files.tar)
fi
if [ -n "$FILES_PRIVATE" ]; then
  RESTORE_FLAGS+=(--with-private-files /tmp/site-restore/private-files.tar)
fi

docker compose exec -T backend bash -lc "
  set -euo pipefail
  if [ ! -d '/home/frappe/frappe-bench/sites/${TARGET_SITE}' ]; then
    bench new-site --mariadb-user-host-login-scope='%' --db-root-username=root --db-root-password='${DB_PASSWORD}' --admin-password=admin '${TARGET_SITE}'
  fi
  bench --site '${TARGET_SITE}' restore /tmp/site-restore/database.sql.gz ${RESTORE_FLAGS[*]}
  if [ -n '${ENCRYPTION_KEY}' ]; then
    bench --site '${TARGET_SITE}' set-config encryption_key '${ENCRYPTION_KEY}'
  fi
  if [ -n '${BACKUP_KEY}' ]; then
    bench --site '${TARGET_SITE}' set-config backup_encryption_key '${BACKUP_KEY}'
  fi
  bench --site '${TARGET_SITE}' set-config -p developer_mode 0
  bench --site '${TARGET_SITE}' migrate
  bench --site '${TARGET_SITE}' clear-cache
  rm -rf /tmp/site-restore
"

echo "=== 4. Restarting application containers to pick up site config ==="
docker compose restart backend websocket queue-short queue-long scheduler frontend
echo "Sync complete. Site '${TARGET_SITE}' is live on port ${HTTP_PUBLISH_PORT:-8080}."
