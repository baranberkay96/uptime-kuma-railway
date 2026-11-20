# syntax=docker/dockerfile:1
#
# Uptime Kuma 2.5.12 for Railway.
#
# The official image, unchanged, plus a start script that
#   1. checks the deploy-form values (invalid ones fall back with a warning),
#   2. creates the first admin account from UPTIME_KUMA_ADMIN_USERNAME/_PASSWORD
#      before the web server starts, so the public "create admin" setup page is
#      never open to the internet (railway/seed-admin.js, uses Uptime Kuma's own
#      database and password-hash modules),
#   3. starts Uptime Kuma with the MariaDB settings from the template.
#
# Pin (checked 2026-11-20 on Docker Hub): louislam/uptime-kuma:2.5.12 index digest,
# pushed 2026-11-17 (latest stable release; the full image includes Chromium for
# "Real Browser" monitors and the embedded MariaDB option).
ARG KUMA_IMAGE=louislam/uptime-kuma:2.5.12@sha256:8e4b6bef96417ec98a35dc103c99cc64fc229a01e584e56d95d9004d2003c02a
FROM ${KUMA_IMAGE}

COPY --chmod=0755 railway/ /app/railway/

# Data (db-config.json, uploads, screenshots) lives on the Railway volume at /app/data
# (no VOLUME instruction: Railway rejects it).
EXPOSE 3001
ENTRYPOINT ["/usr/bin/dumb-init", "--", "/app/railway/start.sh"]
