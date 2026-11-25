#!/usr/bin/env bash
export PATH="/home/soleos/.local/bin:/home/soleos/.nvm/versions/node/v24.21.0/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

# Stop any stale/orphaned bench processes holding Frappe ports before starting
pkill -f 'redis-server 127.0.0.1:11001' 2>/dev/null || true
pkill -f 'redis-server 127.0.0.1:13001' 2>/dev/null || true
pkill -f 'redis-server config/redis_' 2>/dev/null || true
pkill -f 'frappe.utils.bench_helper frappe (serve|schedule|worker|watch)' 2>/dev/null || true
pkill -f 'apps/frappe/socketio.js' 2>/dev/null || true
sleep 1

cd /home/soleos/frappe-bench || exit 1
exec bench start
