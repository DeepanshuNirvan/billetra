# Billetra — Free Deployment Guide

Deploy Billetra (React + Go + Postgres) to the public internet for **free**, good for at least a year, no credit card, no Docker/Kubernetes/CI.

Sized for: ~4–5 users, ~4–5 bills/day. Products, customers, bills all managed live.

---

## 1. The Free Stack

| Piece | Service | Free tier | Why |
|-------|---------|-----------|-----|
| **Database** (Postgres) | [Neon](https://neon.tech) | 0.5 GB, no time limit, no card | Persistent. Does **not** expire after 90 days (Render/Supabase do worse). Auto-sleeps compute but wakes on connect. |
| **Backend** (Go API) | [Render](https://render.com) Web Service | 750 hrs/month, no card | 750 hrs ≈ one always-on service for a full month. Simple Git deploy. |
| **Frontend** (React) | [Vercel](https://vercel.com) | Generous static hosting, no card | Best Vite support. Free custom domain + HTTPS. |
| **Domain** | your registrar | (you buy this) | Point it at Vercel. |
| **Keep-alive** (optional) | [cron-job.org](https://cron-job.org) | free | Pings backend so it never cold-starts. |

**Total cost: $0** (only the domain, ~₹800/yr, which you already plan to buy).

### Known trade-offs
- **Render free cold start**: after 15 min idle the service sleeps; next request takes ~50s. Fix with the keep-alive cron (Step 6). 750 free hrs = enough for one service running 24/7.
- **Neon compute auto-suspend**: first query after idle adds ~1s. Harmless.
- **0.5 GB DB**: thousands of bills fit easily. Fine for years at your volume.

---

## 2. Prerequisites

1. Push this repo to **GitHub** (Render + Vercel deploy from GitHub).
   ```bash
   git add .
   git commit -m "prep for deploy"
   git push origin main
   ```
2. Sign up (use "Login with GitHub" on each — no card):
   - https://neon.tech
   - https://render.com
   - https://vercel.com

> **Code change already applied:** backend now reads a `DB_SSLMODE` env var (defaults to `disable` for local). Neon needs `require`. Make sure this commit is pushed.

---

## 3. Database — Neon

1. Neon Console → **Create project**. Name: `billetra`. Region: closest to your users (e.g. *AWS Asia Pacific (Mumbai)* / `ap-south-1`).
2. After creation Neon shows a **connection string**:
   ```
   postgresql://USER:PASSWORD@ep-xxxx-xxxx.ap-south-1.aws.neon.tech/neondb?sslmode=require
   ```
3. Pull these pieces out of it — you'll paste them into Render in Step 4:

   | Render env var | Value from connection string |
   |----------------|------------------------------|
   | `DB_HOST` | `ep-xxxx-xxxx.ap-south-1.aws.neon.tech` |
   | `DB_PORT` | `5432` |
   | `DB_USER` | the `USER` part |
   | `DB_PASSWORD` | the `PASSWORD` part |
   | `DB_NAME` | `neondb` (or whatever follows the host) |
   | `DB_SSLMODE` | `require` |

   > Keep the password safe. Migrations run **automatically** on backend startup — no manual migrate step.

---

## 4. Backend — Render

1. Render Dashboard → **New → Web Service** → connect your GitHub repo.
2. Settings:
   - **Root Directory**: `backend`
   - **Runtime / Language**: `Go`
   - **Build Command**: `go build -o server ./cmd/server`
   - **Start Command**: `./server`
   - **Instance Type**: `Free`
3. **Environment Variables** (Add from Step 3 plus these):

   | Key | Value |
   |-----|-------|
   | `DB_HOST` | *(from Neon)* |
   | `DB_PORT` | `5432` |
   | `DB_USER` | *(from Neon)* |
   | `DB_PASSWORD` | *(from Neon)* |
   | `DB_NAME` | `neondb` |
   | `DB_SSLMODE` | `require` |
   | `JWT_SECRET` | a long random string — generate below |
   | `ENV` | `production` |
   | `FRONTEND_URL` | `https://yourdomain.com` *(set after Step 5; can update later)* |

   Generate a strong `JWT_SECRET`:
   ```bash
   # any of these
   openssl rand -base64 48
   ```
   > Render auto-sets `PORT` — the app already reads it. Don't override it.

4. **Create Web Service**. Watch the logs for:
   ```
   Database connected successfully
   Migrations applied successfully
   Billetra backend starting on port ...
   ```
5. Copy your backend URL, e.g. `https://billetra-backend.onrender.com`. Test:
   ```
   https://billetra-backend.onrender.com/health  →  {"status":"ok"}
   ```

---

## 5. Frontend — Vercel

1. Vercel → **Add New → Project** → import your GitHub repo.
2. Settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite` (auto-detected)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. **Environment Variable**:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://billetra-backend.onrender.com/api` |

   > Note the `/api` suffix — the frontend calls `VITE_API_URL` directly. Must include it.
4. **Deploy**. You get a URL like `https://billetra.vercel.app`. Open it, log in.

### SPA routing fix (important)
React Router needs all paths to serve `index.html`, else refresh on `/dashboard` 404s. Create **`frontend/vercel.json`**:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
Commit + push → Vercel redeploys.

---

## 6. Custom Domain + finishing CORS

1. **Vercel → Project → Settings → Domains** → add `yourdomain.com` (and `www`). Vercel shows the DNS records.
2. At your **registrar**, add the records Vercel gives you:
   - `A` record `@` → Vercel IP, **or**
   - `CNAME` `www` → `cname.vercel-dns.com`
   - (Vercel's panel tells you exactly.) HTTPS is automatic.
3. **Update backend CORS**: go back to Render → env var `FRONTEND_URL` = `https://yourdomain.com` → save (auto-redeploys).
   > CORS allows exactly one origin. If you use both `yourdomain.com` and `www.yourdomain.com`, pick one canonical (redirect the other in Vercel) and set `FRONTEND_URL` to that one.

### Keep-alive (kill cold starts)
1. [cron-job.org](https://cron-job.org) → free account → **Create cronjob**.
2. URL: `https://billetra-backend.onrender.com/health`
3. Interval: every **14 minutes**. Done — backend stays warm.

---

## 7. First login / admin onboarding

Roles: **super_admin** sees all users' data; created **users** are business owners managing only their own products/customers/bills.

Migrations automatically seed a super_admin account (`backend/migrations/012_fix_seed_passwords.sql`):

| Field | Value |
|-------|-------|
| Email | `admin@billetra.com` |
| Password | `Admin@1234` |
| Role | `super_admin` |

> A demo business user is also seeded: `demo@billetra.com` / `Demo@1234`.

**Steps:**
1. Log in as `admin@billetra.com`.
2. Go to **Admin → Users → Create User** and onboard the 4–5 real business owners.
3. Each owner logs in and manages only their own products, customers, and bills. The super_admin sees everyone's data.

> **⚠️ Security — do this before going public:** the seeded passwords are public knowledge (they're in this repo). On a real internet-facing deployment, change the super_admin password immediately, and either delete the demo user or change its password too. To change a password directly:
> ```sql
> -- Neon Console → SQL Editor. Generate the bcrypt hash with the app's signup,
> -- or with: htpasswd -bnBC 10 "" 'NewStrongPass' | tr -d ':\n'
> UPDATE users SET password_hash = '<new-bcrypt-hash>' WHERE email = 'admin@billetra.com';
> -- remove the demo account entirely:
> DELETE FROM users WHERE email = 'demo@billetra.com';
> ```
> Also confirm `JWT_SECRET` on Render is a strong random value (Step 4), not the `change-me` default.

---

## 8. Updating later (the whole workflow)

```bash
git add .
git commit -m "your change"
git push origin main
```
- Render auto-rebuilds the backend.
- Vercel auto-rebuilds the frontend.
- DB migrations run automatically on backend restart.

No SSH, no manual deploy.

---

## 9. Quick troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Login/API calls fail, browser console shows **CORS** error | `FRONTEND_URL` ≠ actual frontend origin | Set Render `FRONTEND_URL` to the exact `https://...` you open in the browser |
| Backend log: `failed to connect to database ... SSL` | SSL mode wrong | `DB_SSLMODE=require` on Render |
| Refreshing `/dashboard` shows 404 | SPA rewrite missing | Add `frontend/vercel.json` (Step 5) |
| First request of the day is very slow (~50s) | Render cold start | Set up keep-alive cron (Step 6) |
| `relation "..." does not exist` | Migrations didn't run | Check Render startup logs for `Migrations applied successfully`; verify DB creds |
| API returns 401 everywhere | `JWT_SECRET` changed/empty | Set a stable `JWT_SECRET`; don't rotate it casually (logs everyone out) |

---

## 10. Free-tier limits to watch (over the year)

- **Neon**: 0.5 GB storage. At 5 bills/day you won't approach this for years.
- **Render**: 750 instance-hrs/month — one 24/7 service ≈ 744 hrs, fits. Don't run a second free service alongside.
- **Vercel**: bandwidth limits are far above what 5 users generate.

All three stay free indefinitely at this scale — no 1-year bomb. Only recurring cost is your domain renewal.
