# Fleet / Lorry — Deployment & Hosting Guide

This document explains how to host the **full project**: backend API, database, web app, and mobile app.

---

## 1. What you are hosting

| Part | Folder | Technology | Runs as |
|------|--------|------------|---------|
| **Backend API** | `backend/` | FastAPI + Uvicorn + SQLAlchemy | Always-on web service |
| **Database** | (managed) | PostgreSQL (prod) / SQLite (local dev) | Managed database |
| **Web app** | `frontend-web/` | React + Vite | Static site (HTML/JS/CSS) |
| **Mobile app** | `frontend-mobile/` | Expo / React Native | APK/IPA on phones (not a website) |

### How they connect

```
┌─────────────────┐     HTTPS      ┌──────────────────────┐
│  Web browser    │ ──────────────►│  Backend API         │
│  (Vercel etc.)  │                │  (Render / Railway)  │
└─────────────────┘                │  FastAPI :8000       │
                                   └──────────┬───────────┘
┌─────────────────┐     HTTPS                 │
│  Mobile app     │ ──────────────────────────┤
│  (Expo)         │                           │ DATABASE_URL
└─────────────────┘                           ▼
                                   ┌──────────────────────┐
                                   │  PostgreSQL            │
                                   │  (Neon / Supabase)     │
                                   └──────────────────────┘
```

**Important:** The mobile app does **not** get uploaded to Vercel. Only the **web** build goes there. Mobile users install an app that calls your **public API URL**.

---

## 2. Recommended hosting (cost summary)

### Best for starting (MVP / demo) — **~$0/month**

| Service | Role | Cost |
|---------|------|------|
| [Neon](https://neon.tech) | PostgreSQL database | Free tier |
| [Render](https://render.com) | FastAPI backend (free tier sleeps when idle) | Free |
| [Vercel](https://vercel.com) or [Cloudflare Pages](https://pages.cloudflare.com) | React web (`frontend-web`) | Free |

### Best for real users (recommended) — **~$7–25/month**

| Service | Role | Cost |
|---------|------|------|
| Neon PostgreSQL | Database | $0 (free) or ~$19 (paid) |
| Render **Starter** web service | Backend always on | **$7/month** |
| Vercel / Cloudflare Pages | Web frontend | **$0** |
| Expo EAS (optional) | Build APK for Android | Free tier available |

### All-in-one VPS (cheaper, more work) — **~$6–12/month**

| Service | Role | Cost |
|---------|------|------|
| DigitalOcean / Hetzner / Hostinger VPS | API + Postgres + nginx on one server | $6–12/month |

Use VPS only if you are comfortable with Linux, SSL, backups, and updates.

---

## 3. Deploy order

Do these in order:

1. **PostgreSQL database** (create `DATABASE_URL`)
2. **Backend API** (connect to database)
3. **Web app** (point to API URL)
4. **Mobile app** (set API URL, build APK/IPA)

---

## 4. Database (PostgreSQL)

### Why not SQLite in production?

Local dev uses `sqlite:///./fleet.db`. On cloud hosts the filesystem is often **ephemeral** — data can be lost on redeploy. Use **PostgreSQL** in production.

Your backend already supports it via `backend/app/database.py`:

```python
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./fleet.db")
```

`psycopg2-binary` is already in `backend/requirements.txt`.

### Option A — Neon (recommended)

1. Sign up at [neon.tech](https://neon.tech)
2. Create project → database name e.g. `fleet_db`
3. Copy connection string:

```text
postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/fleet_db?sslmode=require
```

4. Set this as `DATABASE_URL` on your backend host.

### Option B — Supabase

1. [supabase.com](https://supabase.com) → New project
2. Settings → Database → Connection string (URI mode)
3. Use as `DATABASE_URL`

### Option C — Render Postgres

1. Render dashboard → New → PostgreSQL
2. Copy **Internal Database URL** for backend on Render
3. ~$7/month after free trial

### Tables & seed data

On first deploy, FastAPI runs `Base.metadata.create_all()` and `ensure_default_users()` automatically.

Default logins (created on startup):

| User | Password | Role |
|------|----------|------|
| `admin` | `admin123` | admin |
| `user1` | `user123` | user |
| `driver1` | `driver123` | driver |

**Change these passwords before going live.**

Optional sample fleet data (after API is up):

```bash
curl -X POST https://YOUR-API.onrender.com/seed-proper
```

---

## 5. Backend API (FastAPI)

### Local run (development)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt

# Optional: PostgreSQL locally
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/fleet_management"

uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API: `http://127.0.0.1:8000`
- Swagger docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

### Environment variables (production)

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_URL` | Yes | `postgresql://user:pass@host:5432/fleet_db?sslmode=require` |
| `PORT` | On Render/Railway | Set automatically by platform |

### Deploy on Render (step-by-step)

1. Push code to **GitHub**
2. [render.com](https://render.com) → New → **Web Service**
3. Connect repo, set:
   - **Root directory:** `backend`
   - **Runtime:** Python 3
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variable:
   - `DATABASE_URL` = your Neon/Supabase connection string
5. Deploy → note URL e.g. `https://fleet-api-xxxx.onrender.com`

### Deploy on Railway (alternative)

1. [railway.app](https://railway.app) → New project from GitHub
2. Add service for `backend` folder
3. Set start command same as above
4. Add `DATABASE_URL` variable
5. Generate public domain

### Production checklist (backend)

- [ ] `DATABASE_URL` points to PostgreSQL (not SQLite)
- [ ] HTTPS enabled (Render/Railway do this automatically)
- [ ] Restrict CORS in `backend/app/main.py` — replace `allow_origins=["*"]` with your real domains:
  ```python
  allow_origins=[
      "https://your-web.vercel.app",
      "https://yourdomain.com",
  ]
  ```
- [ ] Change default `admin` / `user1` / `driver1` passwords
- [ ] Disable or protect `/seed-proper` and `/reset-and-seed-proper` in production

### Main API endpoints

| Area | Endpoints |
|------|-----------|
| Health | `GET /health` |
| Auth | `POST /auth/login`, `POST /auth/register-user`, `POST /auth/forgot-password` |
| Users | `GET /users`, `GET /user-profile`, `POST /user-profile` |
| Lorries | `GET/POST /lorries`, `PATCH /lorries/{id}/status` |
| Drivers | `GET/POST /drivers`, assignments, history |
| Trips | `GET/POST /trips`, `PATCH /trips/{id}/status` |
| Expenses | `GET/POST /expenses` |
| Dashboard | `GET /dashboard` |

Full interactive list: `https://YOUR-API-URL/docs`

---

## 6. Web app (React + Vite)

### Local run

```powershell
cd frontend-web
npm install
npm run dev
```

- Web: `http://127.0.0.1:5173`
- Dev proxy: `/api` → `http://127.0.0.1:8000` (see `vite.config.js`)

### Production build

```powershell
cd frontend-web
npm run build
```

Output folder: `frontend-web/dist/`

### Environment variable

Create `frontend-web/.env.production` (or set in Vercel dashboard):

```env
VITE_API_BASE_URL=https://fleet-api-xxxx.onrender.com
```

`frontend-web/src/api.js` uses:

```javascript
const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
```

Without `VITE_API_BASE_URL`, production build expects `/api` on the same domain (needs a reverse proxy). For separate API hosting, **set the full API URL**.

### Deploy on Vercel

1. [vercel.com](https://vercel.com) → Import GitHub repo
2. **Root directory:** `frontend-web`
3. **Build command:** `npm run build`
4. **Output directory:** `dist`
5. Environment variables:
   - `VITE_API_BASE_URL` = `https://your-api.onrender.com`
6. Deploy → e.g. `https://fleet-web.vercel.app`

### Deploy on Cloudflare Pages

1. Pages → Connect GitHub
2. Root: `frontend-web`, build: `npm run build`, output: `dist`
3. Add `VITE_API_BASE_URL` in build environment variables

**Cost:** Free on both Vercel and Cloudflare Pages for typical fleet app traffic.

---

## 7. Mobile app (Expo)

The mobile app is **not** hosted like a website. You:

1. Point it to your live API
2. Build an APK (Android) or IPA (iOS)
3. Distribute via Play Store / App Store or direct APK

### Local run

```powershell
cd frontend-mobile
npm install
npx expo start
```

### Production API URL

Create `frontend-mobile/.env`:

```env
EXPO_PUBLIC_API_BASE_URL=https://fleet-api-xxxx.onrender.com
```

Used in `frontend-mobile/api.js`. **Must be HTTPS** in production.

### Physical device testing

Replace localhost with your machine's LAN IP during dev, or use the deployed API URL.

| Platform | Default dev API |
|----------|-----------------|
| Android emulator | `http://10.0.2.2:8000` |
| iOS simulator | `http://127.0.0.1:8000` |
| Physical phone | `http://YOUR-PC-IP:8000` or production HTTPS URL |

### Build for stores

```powershell
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android
```

| Item | Cost |
|------|------|
| Expo EAS free tier | Limited builds/month — **$0** |
| Google Play developer | **$25 one-time** |
| Apple App Store | **$99/year** |

---

## 8. Full production URLs example

After deployment you will have:

| Component | Example URL |
|-----------|-------------|
| Web | `https://fleet.yourdomain.com` |
| API | `https://api.yourdomain.com` |
| Database | Internal only (not public) |
| API docs | `https://api.yourdomain.com/docs` |

### Environment summary

**Backend (Render/Railway):**

```env
DATABASE_URL=postgresql://...
```

**Web (Vercel build):**

```env
VITE_API_BASE_URL=https://api.yourdomain.com
```

**Mobile (Expo `.env`):**

```env
EXPO_PUBLIC_API_BASE_URL=https://api.yourdomain.com
```

---

## 9. Monthly cost scenarios

### Scenario A — Testing / demo

| Item | Cost |
|------|------|
| Neon DB (free) | $0 |
| Render API (free, sleeps) | $0 |
| Vercel web | $0 |
| **Total** | **$0** |

### Scenario B — Small fleet (recommended live)

| Item | Cost |
|------|------|
| Neon DB (free) | $0 |
| Render API Starter | $7 |
| Vercel web | $0 |
| **Total** | **~$7/month** |

### Scenario C — Growing business

| Item | Cost |
|------|------|
| Neon Launch or Render Postgres | $7–19 |
| Render/Railway API | $7–15 |
| Vercel / custom domain | $0–20 |
| **Total** | **~$15–35/month** |

### Scenario D — India VPS (DIY)

| Item | Cost |
|------|------|
| Hostinger / DO VPS 1GB | ₹399–699 / $6–12 |
| Domain `.in` | ~₹500–800/year |
| **Total** | **~$6–12/month** + domain |

---

## 10. Security before go-live

1. **PostgreSQL** — use strong password, SSL (`sslmode=require`)
2. **CORS** — only your web domain, not `*`
3. **Default passwords** — change `admin123`, `user123`, `driver123`
4. **Seed endpoints** — block `/reset-and-seed-proper` in production
5. **HTTPS everywhere** — web and API must use SSL
6. **Backups** — enable on Neon/Supabase/Render Postgres
7. **Secrets** — never commit `.env` files to GitHub

---

## 11. Custom domain (optional)

| Service | What to map |
|---------|-------------|
| Vercel | `fleet.yourdomain.com` → web |
| Render | `api.yourdomain.com` → backend |
| Cloudflare | DNS + SSL for both |

Update CORS and `VITE_API_BASE_URL` / `EXPO_PUBLIC_API_BASE_URL` to match.

---

## 12. Troubleshooting

| Problem | Fix |
|---------|-----|
| Web can't reach API | Set `VITE_API_BASE_URL`; check CORS on backend |
| Mobile login fails | Use HTTPS API URL; not `localhost` on real phones |
| API slow first request | Render free tier sleeps — upgrade to Starter ($7) |
| Database empty after redeploy | You used SQLite on cloud — switch to PostgreSQL |
| 500 errors on API | Check `DATABASE_URL` and Render logs |

---

## 13. Quick reference — local development

```powershell
# Terminal 1 — Backend
cd d:\Lorry\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Terminal 2 — Web
cd d:\Lorry\frontend-web
npm run dev

# Terminal 3 — Mobile
cd d:\Lorry\frontend-mobile
npx expo start
```

| URL | Purpose |
|-----|---------|
| http://127.0.0.1:8000/docs | API documentation |
| http://localhost:5173 | Web app |
| Expo QR code | Mobile app |

---

## 14. Suggested first deployment plan

1. **Day 1:** Create Neon database + deploy backend on Render Starter ($7)
2. **Day 1:** Deploy web on Vercel (free) with `VITE_API_BASE_URL`
3. **Day 2:** Test login, trips, profile on live web URL
4. **Day 3:** Set `EXPO_PUBLIC_API_BASE_URL` and test mobile against live API
5. **Before users:** Change passwords, fix CORS, enable DB backups

---

*Last updated for project structure: `backend/`, `frontend-web/`, `frontend-mobile/`*
