"use strict";
/*
 * Creates the first Uptime Kuma admin account before the web server starts.
 *
 * Stock Uptime Kuma shows a "create your admin account" page to the first visitor of a
 * new instance; on a public Railway domain anyone could claim it. This script uses
 * Uptime Kuma's own modules (database, migrations, bcrypt password hash) to:
 *   - write db-config.json from the UPTIME_KUMA_DB_* variables and run the migrations,
 *   - create the admin from UPTIME_KUMA_ADMIN_USERNAME / UPTIME_KUMA_ADMIN_PASSWORD
 *     when the user table is empty,
 *   - lock the account with a random password if the variable is unusable (too short or
 *     too weak) and unlock it on a later start once the variable is fixed,
 *   - reset the admin password when UPTIME_KUMA_ADMIN_RESET_PASSWORD=true.
 * It never prints a password. Exit code 0 = ready, 1 = retry later.
 */
process.chdir("/app");

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const MIN_PASSWORD = 12;
const MAX_PASSWORD = 128;
const DB_WAIT_SECONDS = Math.min(Math.max(parseInt(process.env.UPTIME_KUMA_DB_WAIT_SECONDS || "600", 10) || 600, 30), 3600);

const say = (msg) => console.log(`railway-seed: ${msg}`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const truthy = (v) => /^(1|true|yes|on)$/i.test(String(v || "").trim());

function adminUsername() {
    const raw = String(process.env.UPTIME_KUMA_ADMIN_USERNAME || "").trim();
    if (/^[A-Za-z0-9._@-]{1,64}$/.test(raw)) {
        return raw;
    }
    say("WARNING: UPTIME_KUMA_ADMIN_USERNAME is empty or has characters other than letters, digits and . _ @ -; using 'admin'");
    return "admin";
}

function adminPassword(passwordStrength) {
    const raw = String(process.env.UPTIME_KUMA_ADMIN_PASSWORD || "");
    if (raw.length < MIN_PASSWORD || raw.length > MAX_PASSWORD || /\s/.test(raw)) {
        return null;
    }
    if (passwordStrength(raw).value === "Too weak") {
        return null;
    }
    return raw;
}

async function connectWithRetry(Database) {
    const deadline = Date.now() + DB_WAIT_SECONDS * 1000;
    let lastLog = 0;
    for (;;) {
        try {
            await Database.connect(false, true, true);
            return;
        } catch (err) {
            if (Date.now() > deadline) {
                throw new Error(`database still unreachable after ${DB_WAIT_SECONDS}s: ${err.code || err.message}`);
            }
            if (Date.now() - lastLog > 30000) {
                say(`waiting for the database (${err.code || err.message})`);
                lastLog = Date.now();
            }
            await sleep(3000);
        }
    }
}

async function main() {
    const { args } = require("../server/config");
    const Database = require("../server/database");
    const { SetupDatabase } = require("../server/setup-database");
    const { R } = require("redbean-node");
    const passwordHash = require("../server/password-hash");
    const { passwordStrength } = require("check-password-strength");

    Database.initDataDir(args);
    // Writes db-config.json from the UPTIME_KUMA_DB_* variables (same as the server does).
    new SetupDatabase(args, null);
    const lockFile = path.join(Database.dataDir, ".railway-admin-locked");

    await connectWithRetry(Database);
    await Database.patch();

    const username = adminUsername();
    const password = adminPassword(passwordStrength);
    const count = (await R.knex("user").count("id as count").first()).count;

    if (Number(count) === 0) {
        const user = R.dispense("user");
        user.username = username;
        if (password) {
            user.password = await passwordHash.generate(password);
            fs.rmSync(lockFile, { force: true });
            say(`created the admin account '${username}' from UPTIME_KUMA_ADMIN_PASSWORD`);
        } else {
            user.password = await passwordHash.generate(crypto.randomBytes(32).toString("base64url"));
            fs.writeFileSync(lockFile, "locked\n");
            say(`WARNING: UPTIME_KUMA_ADMIN_PASSWORD is empty, shorter than ${MIN_PASSWORD} or longer than ${MAX_PASSWORD} characters, has spaces or is too weak.`);
            say(`         Created the admin account '${username}' LOCKED with a random password nobody knows.`);
            say("         Fix: set a stronger password in the Variables tab and redeploy; it is applied at the next start.");
        }
        user.active = 1;
        await R.store(user);
    } else {
        const first = await R.findOne("user", " 1=1 ORDER BY id ");
        const locked = fs.existsSync(lockFile);
        const reset = truthy(process.env.UPTIME_KUMA_ADMIN_RESET_PASSWORD);
        if (locked || reset) {
            if (password) {
                await R.exec("UPDATE `user` SET password = ?, active = 1 WHERE id = ? ", [await passwordHash.generate(password), first.id]);
                // New JWT secret: signs out every existing session.
                const { initJWTSecret } = require("../server/util-server");
                await initJWTSecret();
                fs.rmSync(lockFile, { force: true });
                say(`set the password of '${first.username}' from UPTIME_KUMA_ADMIN_PASSWORD${reset ? " (UPTIME_KUMA_ADMIN_RESET_PASSWORD=true; set it back to false)" : " (account unlocked)"}`);
            } else {
                say(`WARNING: '${first.username}' stays locked: UPTIME_KUMA_ADMIN_PASSWORD is still unusable (min. ${MIN_PASSWORD} characters, not too weak, no spaces).`);
            }
        } else {
            say(`admin account '${first.username}' exists; UPTIME_KUMA_ADMIN_PASSWORD is only used for the first start (change the password in Settings > Security).`);
        }
    }

    await Database.close();
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        say(`ERROR: ${err && err.message ? err.message : err}`);
        process.exit(1);
    });
