# Deploy and Host Uptime Kuma with Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/uptime-kuma-2-monitoring-status-pages-ma?referralCode=20H68q)

Uptime Kuma is a self-hosted monitoring tool: it checks websites, APIs, ports, DNS, databases, Docker hosts and more every few seconds, alerts you through 90+ notification services, and publishes status pages. This template runs Uptime Kuma 2.5.12 on MariaDB 12.3 LTS, with the admin account created from a generated password.

> Community template, not affiliated with the Uptime Kuma project.

## About Hosting Uptime Kuma

Uptime Kuma is a Node.js app with a web dashboard. Version 2 can store its data in MariaDB instead of a single SQLite file, which keeps the dashboard fast when you have many monitors and a long history. This template runs Uptime Kuma and a MariaDB service on Railway's private network, with a volume for uploads and screenshots.

A fresh Uptime Kuma normally shows a "create your admin account" page to whoever opens it first, which on a public domain could be anyone. This template creates the admin account before the web server starts, from `UPTIME_KUMA_ADMIN_USERNAME` and the generated `UPTIME_KUMA_ADMIN_PASSWORD`, so that page is never exposed.

## Common Use Cases

- Monitor your websites, APIs and SSL certificate expiry, with alerts to Slack, Discord, Telegram, email, Teams, PagerDuty or webhooks
- Publish a public status page for your product, with incidents and maintenance windows
- Check private services in your Railway project (databases, internal APIs) over the private network
- Receive push heartbeats from cron jobs and backups, and alert when one does not arrive

## Dependencies for Uptime Kuma Hosting

- Uptime Kuma service (repo build on the official `louislam/uptime-kuma:2.5.12` image, volume at `/app/data`)
- MariaDB 12.3 LTS (official image, volume)

### Deployment Dependencies

- [Uptime Kuma on GitHub](https://github.com/louislam/uptime-kuma) (MIT license)
- [Uptime Kuma wiki](https://github.com/louislam/uptime-kuma/wiki)
- [Environment variables](https://github.com/louislam/uptime-kuma/wiki/Environment-Variables)
- [MariaDB documentation](https://mariadb.com/docs)

### Implementation Details

| Service | Image | Purpose |
|---|---|---|
| Uptime Kuma | `louislam/uptime-kuma:2.5.12` + start script | Dashboard, monitors, status pages on port 3001 |
| MariaDB | `mariadb:12.3.3` | Monitors, heartbeats, settings (private network only) |

**First steps**

1. Open the Uptime Kuma service, Variables tab, and copy `UPTIME_KUMA_ADMIN_USERNAME` (default `admin`) and `UPTIME_KUMA_ADMIN_PASSWORD`.
2. Open `https://{your-domain}` and log in. Change the password in Settings, Security, and turn on two-factor authentication there.
3. Add a monitor, then a notification (Settings, Notifications), and optionally a status page.
4. To monitor services in this Railway project, use their private address, for example `http://myapp.railway.internal:8080/health`.

**Admin account**

- `UPTIME_KUMA_ADMIN_PASSWORD` is applied at the first start only; later changes in the web UI are kept.
- If the variable is empty, shorter than 12 characters, has spaces or is too weak, the account is created locked with a random password and the log says how to fix it. The next start with a valid password unlocks it.
- Lost the password? Set a new `UPTIME_KUMA_ADMIN_PASSWORD`, set `UPTIME_KUMA_ADMIN_RESET_PASSWORD=true`, redeploy, log in, then set the flag back to `false`. This also signs out all sessions.

**Database**

`UPTIME_KUMA_DB_TYPE=mariadb` (default) uses the MariaDB service; the connection variables reference it, so passwords stay in sync. `sqlite` keeps everything in a file on the Uptime Kuma volume instead (you can then delete the MariaDB service). Choose before the first start: Uptime Kuma does not migrate between the two. MariaDB is tuned for about 512 MB (`DB_MEMORY_LIMIT_MB`); raise it for thousands of monitors.

**Resources and plans**

Measured on Railway: Uptime Kuma about 0.15 GB with a few monitors, MariaDB about 0.16 GB. Each monitor adds a little memory and CPU; "Real Browser" monitors start Chromium and need several hundred MB more. Both services fit the Trial plan (1 GB per service).

**Scaling and upgrades**

Run a single replica: Uptime Kuma schedules all checks in one process. To upgrade, change `KUMA_IMAGE` (tag and digest) in `services/uptime-kuma/Dockerfile` of your fork; migrations run automatically at start. Back up first with Railway's volume backups on both services. Version 3 is in beta; stay on 2.x until it is released.

### Why Deploy Uptime Kuma on Railway?

Railway runs Uptime Kuma and its database as one project with HTTPS, private networking and volume backups, so you have a monitoring dashboard and status page in minutes without managing a server, and you can monitor your other Railway services over the private network.
