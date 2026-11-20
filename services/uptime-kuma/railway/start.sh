#!/bin/bash
# Railway start wrapper for Uptime Kuma. Never exits because of a variable value
# (STANDARD 8.29); refuses to start the web server while no admin account exists.
set -u
cd /app

log() { echo "railway-start: $*"; }

# --- Port ---
if [[ "${PORT:-}" =~ ^[0-9]{1,5}$ ]] && [ "$PORT" -ge 1 ] && [ "$PORT" -le 65535 ]; then :; else
  [ -n "${PORT:-}" ] && log "WARNING: PORT='${PORT}' is not a valid port, using 3001"
  export PORT=3001
fi
unset UPTIME_KUMA_PORT
# Without UPTIME_KUMA_HOST, Node listens on :: (IPv4 and IPv6), which Railway needs.
[ -n "${UPTIME_KUMA_HOST:-}" ] && log "UPTIME_KUMA_HOST=${UPTIME_KUMA_HOST}"

# --- Database type ---
case "${UPTIME_KUMA_DB_TYPE:-mariadb}" in
  mariadb) export UPTIME_KUMA_DB_TYPE=mariadb ;;
  sqlite) export UPTIME_KUMA_DB_TYPE=sqlite ;;
  *) log "WARNING: UPTIME_KUMA_DB_TYPE='${UPTIME_KUMA_DB_TYPE}' is not mariadb or sqlite, using mariadb"; export UPTIME_KUMA_DB_TYPE=mariadb ;;
esac
if [ "$UPTIME_KUMA_DB_TYPE" = mariadb ]; then
  if ! [[ "${UPTIME_KUMA_DB_PORT:-}" =~ ^[0-9]{1,5}$ ]]; then
    log "WARNING: UPTIME_KUMA_DB_PORT='${UPTIME_KUMA_DB_PORT:-}' is not a port, using 3306"
    export UPTIME_KUMA_DB_PORT=3306
  fi
  if [ -z "${UPTIME_KUMA_DB_HOSTNAME:-}" ] || [ -z "${UPTIME_KUMA_DB_NAME:-}" ] || [ -z "${UPTIME_KUMA_DB_USERNAME:-}" ]; then
    log "WARNING: UPTIME_KUMA_DB_HOSTNAME, _NAME or _USERNAME is empty; check the variables that reference the MariaDB service"
  fi
  log "database: MariaDB at ${UPTIME_KUMA_DB_HOSTNAME:-?}:${UPTIME_KUMA_DB_PORT}/${UPTIME_KUMA_DB_NAME:-?}"
else
  unset UPTIME_KUMA_DB_HOSTNAME UPTIME_KUMA_DB_PORT UPTIME_KUMA_DB_NAME UPTIME_KUMA_DB_USERNAME UPTIME_KUMA_DB_PASSWORD
  log "database: SQLite in /app/data"
fi

case "${UPTIME_KUMA_DB_POOL_MAX_CONNECTIONS:-}" in
  ''|*[!0-9]*) [ -n "${UPTIME_KUMA_DB_POOL_MAX_CONNECTIONS:-}" ] && log "WARNING: UPTIME_KUMA_DB_POOL_MAX_CONNECTIONS is not a number, using 10"; export UPTIME_KUMA_DB_POOL_MAX_CONNECTIONS=10 ;;
esac

# --- First admin account (before the web server listens) ---
attempt=1
until node /app/railway/seed-admin.js; do
  if [ "$attempt" -ge 3 ]; then
    log "ERROR: could not prepare the database and the admin account (see above)."
    log "       Uptime Kuma is NOT started, so its setup page is never exposed. Railway restarts the service."
    sleep 15
    exit 1
  fi
  attempt=$((attempt + 1))
  log "retrying the database preparation in 10 s (attempt ${attempt}/3)"
  sleep 10
done

log "starting Uptime Kuma on port ${PORT}"
exec node server/server.js
