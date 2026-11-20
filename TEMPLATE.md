# Uptime Kuma 2 Monitoring + Status Pages (MariaDB): Railway template spec

## Listing

| Field | Value |
|---|---|
| Name | **Uptime Kuma 2 Monitoring + Status Pages (MariaDB)** |
| Description | Self-hosted uptime monitoring, alerts and status pages on MariaDB. (66 chars) |
| Category | Observability |
| Tags | uptime-kuma, uptime, monitoring, status-page, alerts, healthcheck, mariadb, uptimerobot-alternative |
| Icon | `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/uptime-kuma.svg` |
| Repo | `baranberkay96/uptime-kuma-railway`, service root `/services/uptime-kuma` |

## Base market templates

| Code | Active | Image | Notes |
|---|---|---|---|
| `p6dsil` | 652 | `louislam/uptime-kuma:2` (floating) | SQLite on volume `/app/data`, healthcheck `/dashboard`; open first-visitor setup |
| `uptime-kuma-uptimerobot-alternative` | 30 | untagged | volume, no healthcheck |
| `uptime-kuma-1` | 11 | untagged | volume, no healthcheck |

### Improvements over market templates

- 2.5.12 pinned by digest instead of the floating `:2` tag (which moves to every 2.x and could reach a v3 tag line later).
- MariaDB 12.3 LTS as the database (Uptime Kuma 2's option for larger installations), connection variables by reference.
- Admin account created before the web server starts; the public setup page is never reachable. Locked-account fallback for unusable passwords, reset switch for lost passwords.
- Healthcheck on `/api/entry-page` (200 without redirect), `ALWAYS` restart, start script that waits for MariaDB and never starts the server without an admin.

## Pinned versions

| Component | Pin | Released | Checked |
|---|---|---|---|
| Uptime Kuma | `louislam/uptime-kuma:2.5.12@sha256:8e4b6bef96417ec98a35dc103c99cc64fc229a01e584e56d95d9004d2003c02a` | 2026-11-17 | 2026-11-20 |
| MariaDB | `mariadb:12.3.3@sha256:4aaf88b3106382c8c18e49f0cec60267be618fc22f858c4503afb2a2555afed3` | 12.3.3 2026-08-22, image 2026-11-20 | 2026-11-20 |

## Architecture

Uptime Kuma (repo build: official image + `railway/` scripts, volume `/app/data`, public domain on 3001) → MariaDB (private network, volume `/var/lib/mysql`, no TCP proxy). Start: `start.sh` validates variables → `seed-admin.js` (waits up to 600 s for the DB, writes db-config.json, runs migrations, creates/unlocks/resets the admin) → `node server/server.js`. If the seed fails three times the container exits without starting the web server, and Railway restarts it.

## Services

| Service | Healthcheck | Restart | Volume | Domain |
|---|---|---|---|---|
| Uptime Kuma | `/api/entry-page`, 900 s | ALWAYS | `/app/data` | public, 3001 |
| MariaDB | none (TCP) | ALWAYS | `/var/lib/mysql` | private only |

## Variables (Uptime Kuma)

| Variable | Default | Notes |
|---|---|---|
| `UPTIME_KUMA_ADMIN_USERNAME` | `admin` | first start only |
| `UPTIME_KUMA_ADMIN_PASSWORD` | `secret(24)` | first start only; min 12, not "Too weak" |
| `UPTIME_KUMA_ADMIN_RESET_PASSWORD` | `false` | true = apply the variable at next start |
| `UPTIME_KUMA_DB_TYPE` | `mariadb` | or `sqlite` |
| `UPTIME_KUMA_DB_*` | references to MariaDB | |

## Resource profile

Measured values: see the round-12 report. Estimate: Uptime Kuma 0.15 GB idle with a few monitors, MariaDB 0.16 GB (tuned for 512 MB). About $3-6/month idle at Railway prices plus volumes ($0.15/GB-month). Minimum plan: Trial.

## Verification checklist

1. Both services SUCCESS, `/api/entry-page` 200.
2. Anonymous socket `needSetup` → false; `setup` attempt rejected.
3. Login with the generated credentials; add an HTTP monitor; heartbeats arrive.
4. Redeploy Uptime Kuma: monitor and admin survive; log says the admin exists.
5. Short admin password on a fresh deploy: service healthy, account locked, log explains.

## Open questions

- No scheduled MariaDB backup service; Railway volume backups are the documented way.
