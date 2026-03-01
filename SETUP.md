# ⚡ ChaserNet — Setup Guide

Every command is numbered. Do them in order. You'll have a live site at chasernet.com by the end of Step 9.

---

## Prerequisites

- Node.js 18+ installed (`node -v`)
- A Cloudflare account at cloudflare.com (free)
- chasernet.com nameservers pointed to Cloudflare
- Git installed

---

## Step 1 — Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/chasernet.git
cd chasernet
npm install
```

---

## Step 2 — Connect Cloudflare

```bash
npx wrangler login
```
This opens your browser and connects Wrangler to your Cloudflare account.

---

## Step 3 — Create Cloudflare resources

Run these one at a time. Each prints an ID — **copy it, you'll need it in Step 4**.

```bash
# D1 database
npx wrangler d1 create chasernet-db
# → Prints: database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# KV namespace
npx wrangler kv:namespace create CHASERNET_KV
# → Prints: id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# R2 bucket (no ID needed)
npx wrangler r2 bucket create chasernet-assets
```

---

## Step 4 — Paste IDs into config files

Open `workers/api/wrangler.toml` and replace:
```toml
database_id = "REPLACE_WITH_YOUR_D1_ID"   ← paste your D1 id here
id = "REPLACE_WITH_YOUR_KV_ID"            ← paste your KV id here
```

Open `workers/cron/wrangler.toml` and do the same.

---

## Step 5 — Set secrets

```bash
# JWT secret for auth — generate a random string:
npx wrangler secret put JWT_SECRET --name chasernet-api
# Type or paste a long random string when prompted (64+ chars)
# Example generator: openssl rand -hex 32
```

---

## Step 6 — Initialize the database

```bash
# Apply schema
npm run db:init

# Seed with initial storm data and owner account
npm run db:seed
```

---

## Step 7 — Test locally

```bash
# Start the frontend (opens at localhost:5173)
npm run dev

# In a second terminal: start the API worker
cd workers/api && npx wrangler dev
```

Open http://localhost:5173 — you should see the landing page.
Click "Dev bypass" to skip auth and enter the app.

---

## Step 8 — Create Cloudflare Pages project

```bash
# Build the frontend
npm run build

# Create the Pages project (first time only)
npx wrangler pages project create chasernet
```

---

## Step 9 — Deploy everything

```bash
npm run deploy
```

This:
1. Builds the React frontend
2. Deploys to Cloudflare Pages
3. Deploys the API Worker to `api.chasernet.com`
4. Deploys the Cron Worker (runs every 15 minutes)

---

## Step 10 — Connect your domain

1. In Cloudflare dashboard → **Pages** → `chasernet` → **Custom domains**
2. Add: `chasernet.com` and `www.chasernet.com`
3. Cloudflare handles SSL automatically
4. Done in ~2 minutes

---

## Step 11 — Set DNS for API subdomain

In Cloudflare dashboard → **DNS** → Add record:
```
Type: CNAME
Name: api
Target: chasernet-api.YOUR_ACCOUNT.workers.dev
Proxy:  ✓ (orange cloud)
```

---

## Step 12 — Change the default admin password

1. Go to chasernet.com
2. Log in with: `admin@chasernet.com` / `changeme123`
3. Go to Profile → change password immediately

---

## You're live. ✅

- Frontend: https://chasernet.com
- API:      https://api.chasernet.com
- Cron:     Running every 15 minutes in the background

---

## What's next (Phase 2)

- Wire the frontend to the real API (replace mock data in LiveTab, ModelsTab, BattleTab)
- Enable real-time chat (uncomment chat worker deploy in `scripts/deploy.js`)
- Add push notification subscription UI
- Build the Discord bot bridge

See `ChaserNet-BuildPlan.docx` for the full 4-phase roadmap.

---

## Common issues

**`database_id` not found** — run `npx wrangler d1 list` to get your ID

**CORS errors in dev** — make sure `ALLOWED_ORIGIN` in `workers/api/wrangler.toml` [env.preview] matches `http://localhost:5173`

**Map doesn't load** — check browser console for MapLibre errors; the OSM tile URL sometimes needs a moment on first load

**Auth not working** — verify `JWT_SECRET` is set: `npx wrangler secret list --name chasernet-api`
