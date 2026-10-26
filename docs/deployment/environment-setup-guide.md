# KIBO360 Project Hub — Environment Setup Guide

Comprehensive setup, configuration, and provisioning manual for the **KIBO360 Project Hub** ([Livexpert Technologies Pvt. Ltd.](file:///C:/Users/ajit/.gemini/antigravity/scratch/kibo360-project-hub)).

---

## 1. System Architecture Overview

KIBO360 Project Hub employs a three-tier decoupled architecture:
1. **Frontend Presentation Tier**: React 18 Single-Page Application (SPA) built with Vite, TypeScript, and TailwindCSS. Served via Nginx with Brotli/Gzip compression and immutable asset caching.
2. **Backend Application Tier**: Node.js & Express REST API with TypeScript, Prisma ORM, Helmet security headers, rate limiting, and in-process background job scheduling.
3. **Data & Persistence Tier**: PostgreSQL 16 database with persistent storage volumes, relational integrity, foreign key cascades, and point-in-time backup tooling.

```
                          ┌─────────────────────────┐
                          │     Client Browser      │
                          │   (Desktop / Mobile)    │
                          └────────────┬────────────┘
                                       │ HTTPS (Port 443)
                                       ▼
                     ┌───────────────────────────────────┐
                     │    Nginx Reverse Proxy & SSL      │
                     │    (kibo360.livexpert.in)         │
                     └───────┬───────────────────┬───────┘
                             │                   │
         Static Assets (/)   │                   │  API Calls (/api/v1/*)
                             ▼                   ▼
                 ┌───────────────────┐   ┌───────────────────┐
                 │  Vite React SPA   │   │  Node.js Backend  │
                 │  (HTML/CSS/JS)    │   │  Express API      │
                 └───────────────────┘   └─────────┬─────────┘
                                                   │
                                                   │ Prisma ORM / SQL
                                                   ▼
                                         ┌───────────────────┐
                                         │   PostgreSQL 16   │
                                         │   (kibo360_hub)   │
                                         └───────────────────┘
```

---

## 2. Infrastructure Prerequisites

| Component | Minimum Specification | Recommended Production |
| :--- | :--- | :--- |
| **Operating System** | Ubuntu 22.04 LTS / Debian 12 / Windows Server 2022 | Ubuntu 24.04 LTS (x86_64) |
| **CPU** | 2 vCPU cores | 4 vCPU cores |
| **RAM** | 2 GB Memory | 8 GB Memory |
| **Disk Space** | 20 GB SSD storage | 50 GB NVMe SSD |
| **Node.js** | v20.12.0 LTS | v20.18.0+ LTS |
| **Container Engine** | Docker Engine 24.0+ & Compose v2.20+ | Docker Engine 26.0+ & Compose v2.27+ |
| **Database** | PostgreSQL 16 Alpine | PostgreSQL 16 (Multi-AZ Managed or Dedicated) |
| **Web Server** | Nginx 1.24+ | Nginx 1.25+ with OpenSSL 3.0+ |

---

## 3. Environment Segregation Matrix

| Setting | Local Development | Staging Environment | Production Environment |
| :--- | :--- | :--- | :--- |
| **Hostname** | `localhost` | `staging.kibo360.livexpert.in` | `kibo360.livexpert.in` |
| **Frontend URL** | `http://localhost:5173` | `http://localhost:5174` | `https://kibo360.livexpert.in` |
| **Backend API URL** | `http://localhost:5000/api/v1` | `http://localhost:5001/api/v1` | `https://kibo360.livexpert.in/api/v1` |
| **PostgreSQL Port** | `5432` | `5433` | `5432` (internal Docker network) |
| **Database Name** | `kibo360_hub` | `kibo360_staging` | `kibo360_hub` |
| **Database User** | `postgres` | `postgres` | `kibo360_app` (least privilege) |
| **TLS / SSL** | Disabled | Optional / Self-signed | **Mandatory** (Let's Encrypt / Wildcard CA) |
| **Rate Limiter Max**| 1,000 req / 15m | 2,000 req / 15m | 1,000 req / 15m |

---

## 4. Configuration Variables Reference (`.env`)

Every environment relies on a validated configuration file. Copy from `.env.production.example` or `.env.staging.example`.

| Variable | Required | Type | Example / Default | Description |
| :--- | :---: | :---: | :--- | :--- |
| `NODE_ENV` | **Yes** | String | `production` | Environment mode (`development`, `test`, `production`). |
| `PORT` | **Yes** | Integer | `5000` | Port for the Express HTTP server process. |
| `FRONTEND_URL` | **Yes** | URL | `https://kibo360.livexpert.in` | Client application origin used for CORS allowlisting. |
| `CORS_ORIGIN` | **Yes** | String | `https://kibo360.livexpert.in` | Explicit CORS header configuration. |
| `DATABASE_URL` | **Yes** | String | `postgresql://kibo360_app:pass@host:5432/kibo360_hub` | Standard PostgreSQL connection string. |
| `JWT_ACCESS_SECRET` | **Yes** | String | *(64-character hex)* | Cryptographic HMAC secret for signing 15m access tokens. |
| `JWT_REFRESH_SECRET`| **Yes** | String | *(64-character hex)* | Cryptographic HMAC secret for signing 7d refresh tokens. |
| `JWT_ACCESS_EXPIRES_IN`| No | String | `15m` | Token expiration window. |
| `JWT_REFRESH_EXPIRES_IN`| No | String | `7d` | Refresh token lifecycle. |
| `COMPANY_TIMEZONE` | **Yes** | String | `Asia/Kolkata` | IANA timezone string for consistent deadline calculation. |
| `RATE_LIMIT_WINDOW_MS`| No | Integer | `900000` | Rate limiter window in milliseconds (15 minutes). |
| `RATE_LIMIT_MAX_REQUESTS`| No | Integer | `1000` | Maximum requests per client IP per window. |
| `SMTP_HOST` | No | String | `smtp.livexpert.in` | Outbound mail server hostname. |
| `SMTP_PORT` | No | Integer | `587` | Outbound mail submission port (587 STARTTLS / 465 SSL). |
| `SMTP_USER` | No | String | `no-reply@livexpert.in` | SMTP authentication username. |
| `SMTP_PASS` | No | String | `SecretAppPassword!` | SMTP authentication password. |
| `SMTP_FROM` | No | String | `Livexpert Security <security@livexpert.in>` | From header on password reset and notification emails. |

---

## 5. Generating Cryptographic Secrets

In production, default secrets are **strictly rejected** by the environment validator. Generate fresh 256-bit entropy keys:

```bash
# On Linux / macOS / Git Bash
openssl rand -hex 32
openssl rand -hex 32

# On Windows PowerShell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 6. Pre-Flight Configuration Verification

Before starting containers or initiating a deployment, execute the pre-flight verification script:

```bash
# Verify production configuration
npx tsx deployment/scripts/verify-env.ts .env.production

# Verify staging configuration
npx tsx deployment/scripts/verify-env.ts .env.staging
```

Expected output:
```text
🔍 Verifying environment configuration: .env.production

--------------------------------------------------------------------------------
Configuration Check                | Status | Details
--------------------------------------------------------------------------------
Environment Mode                    | ✅ PASS | NODE_ENV is set to 'production'
JWT Access Secret                   | ✅ PASS | High entropy 32+ character secret confirmed.
JWT Refresh Secret                  | ✅ PASS | High entropy 32+ character secret confirmed.
Database Connection URL             | ✅ PASS | Valid PostgreSQL connection string format.
Company Timezone                    | ✅ PASS | Valid IANA timezone 'Asia/Kolkata'
Server Port                         | ✅ PASS | Configured on port 5000
--------------------------------------------------------------------------------

🎉 All pre-flight environment checks PASSED successfully.
```

---

## 7. Containerized Deployment via Docker Compose

### 7.1 Production Deployment

1. Prepare SSL certificates:
   ```bash
   npx tsx deployment/scripts/generate-ssl.ts
   ```
2. Create `.env.production` from `.env.production.example` and set strong passwords.
3. Launch the full production stack:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```
4. Verify running containers:
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```
   Containers `kibo360-prod-postgres`, `kibo360-prod-backend`, and `kibo360-prod-frontend` should display status `Up (healthy)`.

### 7.2 Staging Deployment

1. Create `.env.staging` from `.env.staging.example`.
2. Launch the staging stack:
   ```bash
   docker compose -f docker-compose.staging.yml up -d --build
   ```
3. Run the automated staging verification test:
   ```bash
   npx tsx deployment/scripts/verify-staging.ts http://localhost:5001/api/v1
   ```

---

## 8. Bare-Metal & Virtual Machine Deployment (PM2 + Systemd)

If deploying to a dedicated Linux host without Docker:

### 8.1 Setup Service User & Directories
```bash
sudo useradd -m -s /bin/bash kibo360
sudo mkdir -p /var/www/kibo360
sudo chown -R kibo360:kibo360 /var/www/kibo360
```

### 8.2 Build Artifacts & Deploy
```bash
cd /var/www/kibo360
git clone https://github.com/livexpert/kibo360-project-hub.git .
npm ci --prefix backend
npm run build --prefix backend
npm ci --prefix frontend
npm run build --prefix frontend
```

### 8.3 Option A: Manage Process with PM2
```bash
cd /var/www/kibo360/backend
npm install -g pm2
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

### 8.4 Option B: Manage Process with Systemd
```bash
sudo cp /var/www/kibo360/deployment/systemd/kibo360-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable kibo360-backend
sudo systemctl start kibo360-backend
sudo systemctl status kibo360-backend
```

### 8.5 Configure Nginx
```bash
sudo cp /var/www/kibo360/deployment/nginx/kibo360.conf /etc/nginx/sites-available/kibo360.conf
sudo ln -s /etc/nginx/sites-available/kibo360.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```
