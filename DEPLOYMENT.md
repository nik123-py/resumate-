# Resumate Deployment Guide

This guide covers deploying Resumate with both frontend and backend.

---

## Architecture Overview

- **Frontend**: React + Vite (static files)
- **Backend**: Node.js + Express + SQLite
- **AI**: Gemini API (client-side calls)

---

## Option 1: Vercel (Frontend) + Railway (Backend) [Recommended]

### Step 1: Deploy Backend to Railway

1. **Create Railway Account**: https://railway.app

2. **Create New Project**:
   - Click "New Project" → "Deploy from GitHub repo"
   - Connect your GitHub and select the repository
   - Set the root directory to `Resumate/server`

3. **Configure Environment Variables** in Railway:
   ```
   PORT=3001
   GEMINI_API_KEY=AIzaSyAsW-sXWklyWeSFNCTjsCxCB6J2c5h4Yu8
   CORS_ORIGIN=https://your-vercel-app.vercel.app
   AUTH_TOKEN=resumate-hackathon-spine-hangar-2026
   DB_PATH=./data/resumate.db
   ```

4. **Railway will auto-detect** the `package.json` and run:
   - Build: `npm run build`
   - Start: `npm run start`

5. **Get your Railway URL** (e.g., `https://resumate-backend.up.railway.app`)

### Step 2: Deploy Frontend to Vercel

1. **Create Vercel Account**: https://vercel.com

2. **Import Project**:
   - Click "Add New" → "Project"
   - Import from GitHub
   - Set root directory to `Resumate`

3. **Configure Build Settings**:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **Add Environment Variables**:
   ```
   VITE_API_URL=https://your-railway-backend.up.railway.app
   VITE_API_TOKEN=resumate-hackathon-spine-hangar-2026
   VITE_GEMINI_API_KEY=AIzaSyAsW-sXWklyWeSFNCTjsCxCB6J2c5h4Yu8
   ```

5. **Deploy** and get your URL (e.g., `https://resumate.vercel.app`)

6. **Update Railway CORS_ORIGIN** with your Vercel URL

---

## Option 2: Render (Full Stack)

### Backend on Render

1. **Create Render Account**: https://render.com

2. **New Web Service**:
   - Connect GitHub repo
   - Root Directory: `Resumate/server`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start`

3. **Environment Variables**:
   ```
   PORT=10000
   GEMINI_API_KEY=AIzaSyAsW-sXWklyWeSFNCTjsCxCB6J2c5h4Yu8
   CORS_ORIGIN=https://your-frontend.onrender.com
   AUTH_TOKEN=resumate-hackathon-spine-hangar-2026
   DB_PATH=/data/resumate.db
   ```

4. **Add Disk** (for SQLite persistence):
   - Mount Path: `/data`
   - Size: 1 GB

### Frontend on Render

1. **New Static Site**:
   - Root Directory: `Resumate`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`

2. **Environment Variables**:
   ```
   VITE_API_URL=https://your-backend.onrender.com
   VITE_API_TOKEN=resumate-hackathon-spine-hangar-2026
   ```

---

## Option 3: Single Server (VPS/DigitalOcean)

For a VPS like DigitalOcean, Linode, or AWS EC2:

### 1. Setup Server

```bash
# SSH into your server
ssh root@your-server-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
npm install -g pm2

# Install Nginx
sudo apt install nginx
```

### 2. Clone and Build

```bash
# Clone repository
git clone https://github.com/your-username/resumate.git
cd resumate/Resumate

# Build frontend
npm install
npm run build

# Build backend
cd server
npm install
npm run build
```

### 3. Configure Environment

Create `/root/resumate/Resumate/server/.env`:
```
PORT=3001
GEMINI_API_KEY=AIzaSyAsW-sXWklyWeSFNCTjsCxCB6J2c5h4Yu8
CORS_ORIGIN=https://yourdomain.com
AUTH_TOKEN=resumate-hackathon-spine-hangar-2026
DB_PATH=./data/resumate.db
```

### 4. Start Backend with PM2

```bash
cd /root/resumate/Resumate/server
pm2 start dist/index.js --name resumate-backend
pm2 save
pm2 startup
```

### 5. Configure Nginx

Create `/etc/nginx/sites-available/resumate`:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend (static files)
    location / {
        root /root/resumate/Resumate/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/resumate /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. SSL with Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Option 4: Docker Deployment

### Dockerfile for Backend

Create `Resumate/server/Dockerfile`:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start"]
```

### Dockerfile for Frontend

Create `Resumate/Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### docker-compose.yml

Create `Resumate/docker-compose.yml`:
```yaml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - "80:80"
    depends_on:
      - backend
    environment:
      - VITE_API_URL=http://backend:3001

  backend:
    build: ./server
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - CORS_ORIGIN=http://localhost
      - AUTH_TOKEN=resumate-hackathon-spine-hangar-2026
      - DB_PATH=/data/resumate.db
    volumes:
      - backend-data:/data

volumes:
  backend-data:
```

Run with:
```bash
docker-compose up -d
```

---

## Environment Variables Reference

### Frontend (.env or Vercel/Render)
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://api.resumate.com` |
| `VITE_API_TOKEN` | Auth token | `resumate-hackathon-spine-hangar-2026` |
| `VITE_GEMINI_API_KEY` | Gemini API key (optional, uses client-side) | `AIza...` |

### Backend (.env or Railway/Render)
| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `GEMINI_API_KEY` | Gemini API key | `AIza...` |
| `CORS_ORIGIN` | Frontend URL | `https://resumate.vercel.app` |
| `AUTH_TOKEN` | Auth token | `resumate-hackathon-spine-hangar-2026` |
| `DB_PATH` | SQLite database path | `./data/resumate.db` |

---

## Quick Start Commands

### Local Development
```bash
# Terminal 1: Backend
cd Resumate/server
npm install
npm run dev

# Terminal 2: Frontend
cd Resumate
npm install
npm run dev
```

### Production Build
```bash
# Backend
cd Resumate/server
npm run build
npm run start

# Frontend
cd Resumate
npm run build
npm run preview
```

---

## Troubleshooting

### CORS Errors
- Ensure `CORS_ORIGIN` in backend matches your frontend URL exactly
- Include protocol (`https://`)

### Database Issues on Render/Railway
- SQLite needs persistent storage
- Use Railway's volume or Render's disk feature
- Or switch to PostgreSQL for production

### API Key Issues
- Gemini API key should be set in both frontend and backend
- Frontend uses it for AI Assistant chat
- Backend uses it for resume scoring

### 502 Bad Gateway
- Check if backend is running: `pm2 status`
- Check logs: `pm2 logs resumate-backend`
- Verify port configuration matches Nginx proxy

---

## Recommended: Vercel + Railway

For the hackathon, I recommend:
1. **Railway** for backend (free tier, easy SQLite)
2. **Vercel** for frontend (free tier, fast CDN)

Total cost: **$0** for development/demo
