# NOTICE: Uptime Kuma 2.5 Monitoring + Status Pages (MariaDB) template

**This template runs Uptime Kuma (louislam/uptime-kuma).** Uptime Kuma is © Louis Lam and contributors, licensed under the MIT License. This is a community template; it is not affiliated with or endorsed by the Uptime Kuma project, MariaDB or Railway.

## Components

| Component | Source | License | How it is used |
|---|---|---|---|
| Uptime Kuma 2.5.12 | https://github.com/louislam/uptime-kuma, image `louislam/uptime-kuma:2.5.12@sha256:8e4b6bef96417ec98a35dc103c99cc64fc229a01e584e56d95d9004d2003c02a` | MIT | Base image, unmodified |
| MariaDB Server 12.3.3 | image `mariadb:12.3.3@sha256:4aaf88b3106382c8c18e49f0cec60267be618fc22f858c4503afb2a2555afed3` (Docker Official Image) | GPL-2.0 | Database service, unmodified; start command (memory tuning) reused from our own MariaDB template |
| Uptime Kuma icon | dashboard-icons (homarr-labs), `svg/uptime-kuma.svg` | Apache-2.0 (collection); logo belongs to Uptime Kuma | Marketplace icon |

Uptime Kuma's MIT license requires keeping its copyright notice ("Copyright (c) 2021 Louis Lam"); the image ships the LICENSE file unchanged.

## Files written for this template

`services/uptime-kuma/Dockerfile`, `railway/start.sh` and `railway/seed-admin.js` were written for this template. `seed-admin.js` does not change Uptime Kuma's files; it calls Uptime Kuma's own modules (`server/database.js`, `server/setup-database.js`, `server/password-hash.js`, `server/util-server.js`) the same way the upstream tools `extra/reset-password.js` and the server's `setup` handler do, to create the first admin before the web server starts. They are offered under the MIT License.

## Upstream files checked

At tag `2.5.12` (2026-11-17): `docker/dockerfile` (dumb-init, `node server/server.js`, port 3001, `UPTIME_KUMA_ENABLE_EMBEDDED_MARIADB`), `server/server.js` (setup flow: `needSetup` when the user table is empty, `setup` socket handler, `/api/entry-page`), `server/setup-database.js` (`UPTIME_KUMA_DB_*` variables override db-config.json), `server/database.js` (MariaDB connect, `CREATE DATABASE IF NOT EXISTS`, knex migrations, pool size), `server/config.js` (`PORT`/`UPTIME_KUMA_HOST`, dual-stack default), `extra/reset-password.js`, `server/password-hash.js`, `server/model/user.js`.

## Market templates reviewed

`p6dsil` "Uptime Kuma" (652 active projects), `uptime-kuma-uptimerobot-alternative` (30) and `uptime-kuma-1` (11), read on 2026-11-20. All run the floating `louislam/uptime-kuma:2` or untagged image with SQLite on a volume and leave the first-visitor admin setup page open. Nothing was copied from them.
