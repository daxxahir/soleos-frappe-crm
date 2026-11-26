#!/usr/bin/env bash
set -euo pipefail

# Create a fresh site in Docker with all installed Soleos apps.
# Usage: ./scripts/create-site.sh <site-name> [admin-password]

SITE_NAME="${1:-soleos.localhost}"
ADMIN_PASSWORD="${2:-admin}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")"
cd "$DOCKER_DIR"

set -a
# shellcheck disable=SC1091
source .env
set +a

echo "Creating site '${SITE_NAME}' inside Docker backend..."
docker compose exec backend bench new-site \
  --mariadb-user-host-login-scope='%' \
  --db-root-username=root \
  --db-root-password="${DB_PASSWORD}" \
  --admin-password="${ADMIN_PASSWORD}" \
  --install-app erpnext \
  --install-app hrms \
  --install-app payments \
  --install-app india_compliance \
  --install-app offsite_backups \
  --install-app blog \
  --install-app builder \
  --install-app telephony \
  --install-app crm \
  --install-app insights \
  --install-app helpdesk \
  --install-app lms \
  --install-app soleos \
  --set-default \
  "${SITE_NAME}"

echo "Site '${SITE_NAME}' created successfully."
