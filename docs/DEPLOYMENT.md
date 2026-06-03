# The Rooms — Complete Deployment Guide
# Self-hosted on Hostinger VPS (Ubuntu 22.04)
# Infrastructure: Docker (PG16, Redis, MinIO) + PM2 (5 Next.js apps) + Nginx

## Overview

```
DNS: *.therooms.in → VPS IP
Nginx:443 → reverse proxy → PM2 (5 Node.js apps on ports 3000-3004)
PM2: ecosystem.config.js → all 5 portals
Docker: postgres:5432, redis:6379, minio:9000/9001 (data services)
```

## Step 0: Prerequisites

```bash
# Fresh VPS setup — install once
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx certbot python3-certbot-nginx
sudo systemctl enable nginx

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker
```

## Step 1: Clone & Setup

```bash
# On VPS — clone the repo
git clone https://github.com/your-org/the-rooms.git /opt/therooms
cd /opt/therooms

# Copy and edit env
cp .env.production .env
nano .env   # FILL IN ALL SECRETS

# Create log directory
sudo mkdir -p /var/log/therooms
sudo chown -R $USER:$USER /var/log/therooms
```

## Step 2: Docker Services

```bash
cd /opt/therooms

# Start data services
docker compose up -d

# Wait for postgres
docker compose exec -T postgres pg_isready -U theooms

# Run migrations
npx prisma migrate deploy

# Seed database
npx prisma db seed
```

## Step 3: Build

```bash
cd /opt/therooms
npm install
npm run build
```

## Step 4: Start Apps with PM2

```bash
cd /opt/therooms
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# Auto-restart on reboot
pm2 startup
# Follow the output command from pm2 startup
```

## Step 5: Nginx & SSL

```bash
cd /opt/therooms

# Copy nginx config
sudo cp nginx/conf.d/the-rooms.conf /etc/nginx/conf.d/the-rooms.conf
sudo nginx -t

# For each subdomain, create cert:
sudo certbot --nginx -d therooms.in -d www.therooms.in
sudo certbot --nginx -d my.therooms.in
sudo certbot --nginx -d fo.therooms.in
sudo certbot --nginx -d admin.therooms.in
sudo certbot --nginx -d superadmin.therooms.in

# Reload nginx
sudo nginx -s reload
```

## Step 6: DNS

Configure in Hostinger panel / your DNS provider:

```
A    @         YOUR_VPS_IP
A    *         YOUR_VPS_IP
AAAA @         YOUR_VPS_IPV6 (if available)
```

Or add individual records:
```
A    my        YOUR_VPS_IP
A    fo        YOUR_VPS_IP
A    admin     YOUR_VPS_IP
A    superadmin YOUR_VPS_IP
```

## Step 7: Verify

```bash
# Check all apps are running
pm2 status

# Check nginx
sudo nginx -t

# Check docker services
docker compose ps

# Test each portal
curl -I https://therooms.in/health
curl -I https://my.therooms.in
curl -I https://fo.therooms.in
curl -I https://admin.therooms.in
curl -I https://superadmin.therooms.in

# Test DB connection
docker compose exec postgres psql -U theooms -d theooms -c "SELECT 1"
```

## Step 8: Auto-Restart Cron

```bash
# Add to crontab (crontab -e)
@reboot cd /opt/therooms && pm2 resurrect
```

## Useful Commands

```bash
# Restart all apps
pm2 restart all

# View logs
pm2 logs --lines 50

# Tail one app
pm2 logs web --lines 50

# View app status
pm2 describe web

# Restart single app
pm2 restart web

# Monitor resources
pm2 monit

# Docker logs
docker compose logs -f postgres
docker compose logs -f redis
docker compose logs -f minio

# DB backup
./scripts/backup.sh

# Rebuild after git pull
git pull && npm run build && pm2 restart all
```

## Environment Variables (.env)

Required secrets — fill before deploying:

| Variable | Description | Example |
|---|---|---|
| POSTGRES_USER | DB username | theooms |
| POSTGRES_PASSWORD | DB password | [strong random] |
| DATABASE_URL | PostgreSQL connection string | postgresql://theooms:XXX@localhost:5432/theooms |
| MINIO_ROOT_USER | MinIO access key | [strong random] |
| MINIO_ROOT_PASSWORD | MinIO secret key | [strong random] |
| REDIS_URL | Redis connection string | redis://localhost:6379 |
| NEXTAUTH_SECRET | NextAuth session secret | [openssl rand -base64 32] |
| NEXTAUTH_URL | Base URL for auth | https://therooms.in |
| RESEND_API_KEY | Resend email API key | re_XXXX |
| INDUSIND_MERCHANT_ID | INDUSIND payment merchant ID | INDUSINDMERCH123 |
| INDUSIND_API_KEY | INDUSIND payment API key | [from INDUSIND portal] |
| INDUSIND_WEBHOOK_SECRET | INDUSIND webhook signature key | [random string] |
| MINIO_PUBLIC_URL | MinIO public URL | https://minio.therooms.in |

## Troubleshooting

**App won't start:** Check `.env` has all required vars, check `pm2 logs`
**Nginx 502:** App not running — `pm2 restart <app>`
**Nginx 404:** DNS not propagated or nginx not reloaded — `sudo nginx -s reload`
**DB connection fails:** Check `DATABASE_URL` and `docker compose ps`
**MinIO not working:** Check MINIO credentials match in `.env`
**Certbot fails:** Ensure DNS is propagated before running certbot
**Slow performance:** Increase PM2 instances or `max_memory_restart` in ecosystem.config.js

## Updating the App

```bash
cd /opt/therooms
git pull
npm run build
pm2 restart all
```

## Backup Strategy

```bash
# Daily cron job (add via crontab -e)
0 2 * * * /opt/therooms/scripts/backup.sh >> /var/log/therooms/backup.log 2>&1

# Restore from backup
gunzip -c /backups/postgres/theooms_backup_2026-05-29.sql.gz | docker compose exec -T postgres psql -U theooms -d theooms
```