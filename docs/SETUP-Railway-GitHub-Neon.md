# TixMix — Infrastructure Setup: GitHub + Neon + Railway

End-to-end steps to stand up the stack. Order matters: **GitHub (source) → Neon (database) → Railway (runtime)**. Verified against official Neon and Railway docs (links at bottom).

---

## Prerequisites
- Node.js + npm installed locally
- Accounts: **GitHub**, **Neon** (neon.com), **Railway** (railway.com)
- `git` installed and configured

---

## Step 1 — GitHub repository (source of truth)
1. Create a new repo `tixmix` on GitHub (private to start).
2. Locally: `git init`, add a `.gitignore` that **excludes `.env`**, commit, and push to the repo.
3. (Recommended) Protect `main`: Settings → Branches → add a rule requiring PRs + passing status checks before merge. This enforces the trunk-based flow in the **dev-process** skill.

> ⚠️ Never commit secrets. `.env` is for local dev only and must be gitignored. Production secrets live in Railway/Neon.

---

## Step 2 — Neon Postgres (database)
1. Create a Neon project in the Neon Console; pick the region closest to your Railway region to cut latency.
2. Click **Connect** on the project dashboard and copy the **connection string**. Format:
   ```
   postgresql://USER:PASSWORD@ENDPOINT/DBNAME?sslmode=require&channel_binding=require
   ```
3. **Use the pooled connection string** for the app. Neon is serverless and a Railway app can open many connections; Neon's pooler endpoint (the host containing `-pooler`) prevents connection exhaustion. Keep the direct (non-pooled) string for running migrations.
4. Create a separate **Neon branch** for staging/preview (Neon DB branching gives an isolated copy of the data for testing) — this is what the staging Railway environment will point at.

---

## Step 3 — Local app wiring
```bash
npm init -y
npm pkg set type="module"      # ES modules
npm install express pg          # Postgres driver
```
Create `.env` locally (gitignored):
```
DATABASE_URL=postgresql://...   # paste the Neon POOLED string
PORT=3000
```
Connect using a pool and read config from env (never hardcode):
```js
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```
Make the server listen on Railway's injected port:
```js
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`up on ${port}`));
```
Add a `start` script in `package.json` (`"start": "node server.js"`). Railway auto-detects Node via Railpack, but an explicit start script is safest.

---

## Step 4 — Railway (runtime, continuous deploy from GitHub)
1. Go to **railway.com/new** → **Deploy from GitHub repo** → authorize GitHub if prompted → pick `tixmix`. This sets up **auto-deploy on push**.
2. **Variables** tab → add:
   - `DATABASE_URL` = your Neon **pooled** connection string
   - any other secrets (gateway keys, etc.)
   (Because the DB is external Neon, you set `DATABASE_URL` manually. The `${{Postgres.DATABASE_URL}}` reference syntax is only for a Railway-hosted Postgres — we are **not** using that since we chose Neon.)
3. **Deploy**. Watch **View logs** to confirm the server boots and connects to Neon.
4. **Settings → Networking → Generate Domain** to get a public URL.

---

## Step 5 — Environments (staging vs production)
- Create a **second Railway environment** (or a PR/preview environment) whose `DATABASE_URL` points at the **Neon staging branch** from Step 2.4.
- `main` → production environment; feature branches/PRs → staging/preview. This realizes Gate 4 / staging in the **dev-process** skill.

---

## Step 6 — CI quality gates (GitHub Actions, before Railway deploys)
Add a workflow that runs on every PR and blocks merge on failure: build, lint, type-check, unit + integration tests, P0 concurrency/payment tests, security scan, and a migration dry-run. Only `main` (green) auto-deploys to production. (See the **dev-process** and **qa-engineer** skills for the exact gate list.)

---

## Migrations note
Run migrations with the **direct** (non-pooled) Neon string. Keep every migration **reversible and forward-compatible** (expand → migrate → contract) because trunk-based auto-deploy means old and new code briefly run together.

---

## Quick checklist
- [ ] GitHub repo created, `.env` gitignored, `main` protected
- [ ] Neon project + pooled connection string + staging branch
- [ ] App reads `DATABASE_URL` + `PORT` from env, uses `pg` Pool
- [ ] Railway project deploying from GitHub, `DATABASE_URL` set, domain generated
- [ ] Staging environment on Neon staging branch
- [ ] CI quality gates enforced before deploy

---

## Sources
- Neon + Railway official guide — https://neon.com/docs/guides/railway
- Railway deploy Express from GitHub — https://docs.railway.com/guides/express
- Railway env vars — https://docs.railway.com/guides/frontend-environment-variables
