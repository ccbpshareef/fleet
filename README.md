# Fleet Management System (Web + Mobile + API)

This project gives you a complete starter for:
- **Backend API**: FastAPI + SQLAlchemy
- **Website**: React (Vite)
- **Mobile App**: React Native (Expo)

Core modules included:
- Lorry management
- Driver management
- Trip management
- Expense tracking
- Profit calculation
- Dashboard summary

## 1) Project Structure

- `backend` -> FastAPI server
- `frontend-web` -> React website
- `frontend-mobile` -> React Native mobile app

## 2) Backend Setup (FastAPI)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### Database

By default, backend uses local SQLite (`fleet.db`).

To use PostgreSQL (recommended for production), set:

```bash
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fleet_management
```

### Run backend

```bash
uvicorn app.main:app --reload --port 8000
```

API docs:
- `http://127.0.0.1:8000/docs`

## 3) Website Setup (React)

```bash
cd frontend-web
npm install
npm run dev
```

Web app runs at:
- `http://127.0.0.1:5173`

## 4) Mobile Setup (React Native)

```bash
cd frontend-mobile
npm install
npm run start
```

If you run Android emulator, API base in `frontend-mobile/api.js` is already `http://10.0.2.2:8000`.
If using physical device, replace it with your computer local network IP.

## 5) Implemented APIs

- `POST /drivers`, `GET /drivers`
- `POST /lorries`, `GET /lorries`
- `POST /trips`, `GET /trips`
- `POST /expenses`, `GET /expenses`
- `GET /dashboard`

Profit formula:
- `net_profit = load_price - (diesel + toll + driver_bata + maintenance + other)`

## 6) What to Build Next

- GPS live tracking (Google Maps SDK on mobile + map on web)
- Auth (Admin / Driver login)
- Report exports (PDF, monthly reports)
- Bill photo upload (S3/local file storage)
- Notifications (trip start/end and expense alerts)

## 7) Deployment & Hosting

Full guide for **backend + database + web + mobile** (with costs and step-by-step):

→ **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**
