# Billetra — Free Deployment Guide

Deploy Billetra (React + Go + Postgres) to the public internet for **free**, good for at least a year, no credit card, no Docker/Kubernetes/CI.

Sized for: ~4–5 users, ~4–5 bills/day. Products, customers, bills all managed live.

---

## 1. The Free Stack

| Piece | Service | Free tier | Why |
|-------|---------|-----------|-----|
| **Database** (Postgres) | [Neon](https://neon.tech) | 0.5 GB, no time limit, no card | Persistent. Does **not** expire after 90 days (Render/Supabase do worse). Auto-sleeps compute but wakes on connect. |
| **Backend** (Go API) | [Render](https://render.com) Web Service | 750 hrs/month, no card | 750 hrs ≈ one always-on service for a full month. Simple Git deploy. |
| **Frontend** (React) | [Vercel](https://vercel.com) | Generous static hosting, no card | Best Vite support. Free custom domain + HTTPS. Also **proxies `/api` to the backend** so everything lives on one domain (no CORS). |
| **Domain** | your registrar | (you buy this) | Point it at Vercel. Frontend at `/`, backend at `/api/*` via Vercel rewrite — one domain, no subdomain needed. |
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
   | `FRONTEND_URL` | `https://yourdomain.com` *(set after Section 6; can update later)* |

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

## 5. Frontend — Vercel (single domain, recommended)

You bought **one** domain and want **both** frontend and backend on it. The clean free way: serve the React app at `yourdomain.com` and **proxy `/api/*` through Vercel to the Render backend**. Same origin → no CORS, no second subdomain, and the frontend needs **no env var**.

### Routing model (what hits what)

| You open in browser | Served by | Notes |
|---------------------|-----------|-------|
| `https://yourdomain.com/` and all app routes (`/bills`, `/settings`, …) | Vercel static (React) | SPA |
| `https://yourdomain.com/api/...` | Vercel **rewrites** → `https://billetra-backend.onrender.com/api/...` | Same-origin to the browser; Vercel forwards server-side |
| `https://billetra-backend.onrender.com/health` | Render (direct) | Only used by the keep-alive cron |

So the **single route the frontend hits is `/api`** (relative). The browser never talks to Render directly, so there is **no CORS** to fight.

### Steps

1. Vercel → **Add New → Project** → import your GitHub repo.
2. Settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite` (auto-detected)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. **Environment Variable**: **none needed.** The API client defaults to the relative path `/api` when `VITE_API_URL` is unset (`BASE_URL = import.meta.env.VITE_API_URL ?? '/api'`). Leave it blank.
4. **`frontend/vercel.json`** already exists in the repo with this content — just edit the backend URL:
   ```json
   {
     "rewrites": [
       { "source": "/api/(.*)", "destination": "https://YOUR-BACKEND.onrender.com/api/$1" },
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
   Replace `YOUR-BACKEND.onrender.com` with **your** Render URL from Step 4, commit, push. The API rule (must stay **first**) makes `yourdomain.com/api/...` reach the backend; the catch-all fixes refresh-on-`/bills` 404s.
5. Commit + push → **Deploy**. You get `https://billetra.vercel.app` (replaced by your domain in Step 6). Open it, log in.

> **Why not point `VITE_API_URL` straight at Render?** That works (Option B below) but makes the browser call a *different* origin → you must keep CORS in sync forever. The proxy keeps everything on one origin and one domain — simpler and what you asked for.

---

## 6. Custom Domain + CORS

1. **Vercel → Project → Settings → Domains** → add `yourdomain.com` (and optionally `www`). Vercel shows the DNS records.
2. At your **registrar**, add the records Vercel gives you:
   - `A` record `@` → Vercel IP, **or** `CNAME` `www` → `cname.vercel-dns.com`
   - (Vercel's panel tells you exactly.) HTTPS is automatic.
3. Pick **one** canonical host (e.g. `yourdomain.com`) and redirect `www` to it in Vercel → Domains.
4. **Backend `FRONTEND_URL`**: on Render set `FRONTEND_URL` = `https://yourdomain.com`.
   > With the Vercel proxy the browser is same-origin, so CORS rarely fires — but the backend still reads `FRONTEND_URL`, so set it correctly. Must be the exact scheme+host, no trailing slash, no path.

### Keep-alive (kill cold starts)
1. [cron-job.org](https://cron-job.org) → free account → **Create cronjob**.
2. URL: `https://billetra-backend.onrender.com/health` *(hit Render **directly**, not through the proxy).*
3. Interval: every **14 minutes**. Backend stays warm.

---

## 6b. Alternative — API on a subdomain (Option B)

If you'd rather not proxy, put the backend on `api.yourdomain.com`:

1. Render → your service → **Settings → Custom Domains** → add `api.yourdomain.com`. Add the `CNAME` it shows at your registrar (`api` → `your-service.onrender.com`).
2. Vercel `frontend/vercel.json` keeps **only** the SPA rule:
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```
3. Frontend env var on Vercel:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://api.yourdomain.com/api` |
4. Render `FRONTEND_URL` = `https://yourdomain.com` (now a real cross-origin call, so CORS must match exactly).

Use **Section 5 (proxy)** unless you have a reason to expose the API host. Don't do both at once.

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
| All `/api/...` calls return **404** (page loads, login fails) | `vercel.json` API rewrite missing/wrong, or wrong backend URL in `destination` | Check the `/api/(.*)` rewrite points at your real Render URL; redeploy |
| `/api` calls hit Vercel's own 404 HTML, not JSON | API rewrite is **below** the SPA catch-all | API rule must come **first** in the `rewrites` array (Section 5, step 4) |
| Login/API calls fail, console shows **CORS** error | Using subdomain (Option B) and `FRONTEND_URL` ≠ frontend origin | Set Render `FRONTEND_URL` to the exact `https://yourdomain.com`. (Proxy mode shouldn't hit this.) |
| Backend log: `failed to connect to database ... SSL` | SSL mode wrong | `DB_SSLMODE=require` on Render |
| Refreshing `/bills` shows 404 | SPA rewrite missing | Add the catch-all rule to `frontend/vercel.json` (Section 5) |
| Logo uploads but 413 / fails through proxy | file > limit | Logo capped at 2 MB server-side; use a smaller image |
| First request of the day is very slow (~50s) | Render cold start | Set up keep-alive cron (Step 6) |
| `relation "..." does not exist` | Migrations didn't run | Check Render startup logs for `Migrations applied successfully`; verify DB creds |
| API returns 401 everywhere | `JWT_SECRET` changed/empty | Set a stable `JWT_SECRET`; don't rotate it casually (logs everyone out) |

---

## 10. Free-tier limits to watch (over the year)

- **Neon**: 0.5 GB storage. At 5 bills/day you won't approach this for years.
- **Render**: 750 instance-hrs/month — one 24/7 service ≈ 744 hrs, fits. Don't run a second free service alongside.
- **Vercel**: bandwidth limits are far above what 5 users generate.

All three stay free indefinitely at this scale — no 1-year bomb. Only recurring cost is your domain renewal.
