# SAI WARDHA — Housekeeping Rating Portal (KD3)

Full-stack web application for rating housekeeping quality at SWPGPL Plant.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Axios, xlsx, jsPDF |
| Backend | Node.js, Express |
| Database | SQLite (via better-sqlite3) |
| Auth | JWT (24h expiry) |

---

## Project Structure

```
saiwardha/
├── backend/          ← Express API server
│   ├── server.js     ← Entry point
│   ├── db/init.js    ← SQLite schema + seed data
│   ├── middleware/   ← JWT auth
│   ├── routes/       ← All API routes
│   └── data/         ← SQLite DB file (auto-created)
└── frontend/         ← React app
    ├── src/
    │   ├── App.jsx
    │   ├── pages/    ← Dashboard, Ratings, Admin, Login
    │   ├── hooks/    ← useAuth
    │   └── utils/    ← api.js, export.js
    └── public/
```

---

## Local Development

### 1. Backend

```bash
cd backend
npm install
node server.js
# Runs on http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm start
# Runs on http://localhost:3000
# Proxies /api → localhost:5000 automatically
```

---

## Production Deployment

### Option A — Render.com (Recommended, Free Tier Available)

#### Deploy Backend:
1. Push project to GitHub
2. Go to https://render.com → New → Web Service
3. Connect your repo, select `backend/` as root
4. Set:
   - Build command: `npm install`
   - Start command: `node server.js`
5. Add environment variables:
   ```
   JWT_SECRET=your_very_long_random_secret_here_change_this
   FRONTEND_URL=https://your-frontend-url.onrender.com
   PORT=5000
   ```
6. Deploy → note the URL (e.g. `https://saiwardha-api.onrender.com`)

#### Deploy Frontend:
1. New → Static Site → connect same repo, select `frontend/` as root
2. Set:
   - Build command: `npm install && npm run build`
   - Publish dir: `build`
3. Add environment variable:
   ```
   REACT_APP_API_URL=https://saiwardha-api.onrender.com/api
   ```
4. Deploy

---

### Option B — Railway.app

#### Backend:
```bash
# In backend/ folder
railway login
railway init
railway add
railway up
railway variables set JWT_SECRET=your_secret_here
railway variables set FRONTEND_URL=https://your-frontend.railway.app
```

#### Frontend:
```bash
cd frontend
# Set REACT_APP_API_URL in Railway dashboard
railway up
```

---

### Option C — VPS (Ubuntu)

```bash
# 1. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Clone/upload project
git clone https://github.com/yourrepo/saiwardha.git
cd saiwardha

# 3. Backend
cd backend
npm install
# Create .env file:
echo "JWT_SECRET=your_secret_here_make_it_long" > .env
echo "PORT=5000" >> .env
echo "FRONTEND_URL=https://yourdomain.com" >> .env

# 4. PM2 (keep backend alive)
npm install -g pm2
pm2 start server.js --name saiwardha-api
pm2 save
pm2 startup

# 5. Frontend build
cd ../frontend
npm install
REACT_APP_API_URL=https://yourdomain.com/api npm run build

# 6. Nginx config
sudo nano /etc/nginx/sites-available/saiwardha
```

Nginx config:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend (React build)
    location / {
        root /path/to/saiwardha/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/saiwardha /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL (optional but recommended)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Environment Variables

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | **CHANGE THIS** — secret for JWT signing | `saiwardha_secret_change_in_production` |
| `PORT` | Server port | `5000` |
| `FRONTEND_URL` | Your frontend URL for CORS | `*` |

### Frontend (.env)

| Variable | Description |
|----------|-------------|
| `REACT_APP_API_URL` | Backend API URL e.g. `https://api.yourdomain.com/api` |

---

## Default Credentials

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Administrator |
| `viewer` | `view123` | Viewer |

> ⚠️ **Change default passwords immediately after first login.**

---

## Features

### All Users
- View dashboard with weekly/monthly averages
- View area-wise ratings and status (pass/fail vs benchmark)
- Month selector — switch between historical months

### Users with `can_rate` permission
- Enter grades per sub-area per week
- Bulk save per area

### Users with `can_add_remarks` permission
- Add OEG Remark and General Remark per area

### Users with `can_view_penalties` permission
- See penalty calculations
- Formula: `(Benchmark − Monthly Avg) × 10000 × number_of_sub_areas`

### Users with `can_export` permission
- Export current month data as Excel (.xlsx)
- Export current month data as PDF (A3 landscape, KD3 layout)

### Admin
- Create/edit/deactivate users
- Create/edit/delete roles with custom permissions
- Start new assessment month (auto-locks previous)
- Lock/unlock any month
- Edit plant information (benchmark, package name, SLA description, etc.)

---

## Database

SQLite file auto-created at `backend/data/saiwardha.db` on first run.

**Backup:** just copy `backend/data/saiwardha.db` — that's your entire database.

**Reset:** delete `backend/data/saiwardha.db` and restart backend — seeds fresh data.

---

## Penalty Formula

```
Penalty = (Benchmark − Monthly Average) × 10,000 × SubAreaCount

Where:
  Monthly Average = average of Week 1, 2, 3, 4 averages
  Week Average    = average of all sub-area grades for that week
  Penalty = 0 if Monthly Average ≥ Benchmark
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Current user profile |
| GET | `/api/areas` | All areas + sub-areas |
| GET | `/api/months` | All months |
| GET | `/api/months/current` | Current active month |
| POST | `/api/months` | Create new month (admin) |
| GET | `/api/ratings/month/:id/summary` | Full summary with averages |
| POST | `/api/ratings/bulk` | Save multiple ratings |
| POST | `/api/remarks` | Save remark |
| GET | `/api/users/roles` | All roles |
| POST | `/api/users/roles` | Create role (admin) |
| GET | `/api/users/users` | All users (manage_users perm) |
| POST | `/api/users/users` | Create user |
| GET | `/api/settings/plant-info` | Plant info |
| PUT | `/api/settings/plant-info` | Update plant info (admin) |

---

## Support

Default admin password: `admin123` — change immediately.
DB file location: `backend/data/saiwardha.db`
Logs: `pm2 logs saiwardha-api` (if using PM2)
