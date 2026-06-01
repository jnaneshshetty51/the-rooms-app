# The Rooms — Deployment Architecture
# PM2 on Host (Ubuntu 22.04) + Docker for data services

# ┌─────────────────────────────────────────────────────────┐
# │  Hostinger VPS (Ubuntu 22.04)                         │
# │                                                      │
# │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
# │  │ Nginx    │  │ PM2     │  │ Docker   │            │
# │  │ :80/:443 │──│ (5 apps)│  │(data svc)│            │
# │  └────┬─────┘  └────┬────┘  └────┬─────┘            │
# │       │              │           │                   │
# │  ┌────┴────┐  ┌──────┴────┐  ┌───┴───┐             │
# │  │web:3000 │  │guest:3001│  │PG 5432│             │
# │  │fo:3002  │  │admin:3003│  │Redis  │             │
# │  │sup:3004 │  └──────────┘  │MinIO   │             │
# │  └─────────┘                │9000/9001│             │
# │                             └─────────┘             │
# └─────────────────────────────────────────────────────┘

# PREREQUISITES (on fresh VPS):
# 1. Clone repo: git clone https://github.com/your-org/the-rooms.git /opt/therooms
# 2. cd /opt/therooms && npm install
# 3. cp .env.production .env  &&  edit .env with real secrets
# 4. docker compose up -d  (starts postgres, redis, minio)
# 5. npx prisma migrate deploy
# 6. npx prisma db seed
# 7. npm run build  (builds all 5 apps)
# 8. pm2 start ecosystem.config.js
# 9. Certbot for SSL: sudo certbot --nginx

# FILES TO CREATE:
# - ecosystem.config.js  (PM2 config for all 5 apps)
# - nginx/conf.d/the-rooms.conf  (updated subdomain routing)
# - .env.production  (env template)
# - deploy.sh  (one-command deploy script)