# The Rooms — Infrastructure Guide

## Overview

Self-hosted infrastructure powered by Docker Compose. Services: **PostgreSQL 16**, **Redis**, **MinIO (S3)**, **Nginx**.

## Services

| Service   | Port  | Purpose                            |
|-----------|-------|------------------------------------|
| Postgres  | 5432  | Primary database                   |
| Redis     | 6379  | Caching & session storage          |
| MinIO API | 9000  | S3-compatible object storage API   |
| MinIO UI  | 9001  | MinIO Console (admin)              |
| Nginx     | 80/443| Reverse proxy                      |

## Quick Start

```bash
# 1. Copy environment template
cp .env.production .env

# 2. Edit .env with your values
nano .env

# 3. Start infrastructure
docker compose up -d

# 4. Check service health
docker compose ps

# 5. Run database migrations
./scripts/run-migrations.sh
```

## Docker Commands

```bash
# Start services
docker compose up -d

# Stop services (preserves data volumes)
docker compose down

# Stop + remove volumes (destroy data!)
docker compose down -v

# View logs
docker compose logs -f postgres
docker compose logs -f redis
docker compose logs -f minio
docker compose logs -f nginx

# Restart a specific service
docker compose restart postgres

# Shell into postgres
docker compose exec postgres psql -U the_rooms -d the_rooms
```

## MinIO Browser Access

- **Console URL**: http://localhost:9001
- **Credentials**: Use `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD` from your `.env` file

### Create access keys via MinIO Console:
1. Log in at http://localhost:9001
2. Go to **Identity → Access Keys → Create Access Key**
3. Save `access_key` and `secret_key` — use in your app config for S3 upload

### Default buckets created on startup:
| Bucket           | Access     | Auto-expiry |
|------------------|------------|-------------|
| rooms-photos     | Public     | None        |
| announcements    | Public     | None        |
| guest-documents  | Private    | 90 days     |
| invoices         | Private    | None        |
| receipts         | Private    | None        |

## Environment Variables

Required in `.env`:

```env
POSTGRES_USER=therooms
POSTGRES_PASSWORD=<strong-random-password>
DATABASE_URL=postgresql://therooms:<password>@postgres:5432/the_rooms

MINIO_ROOT_USER=<your-minio-user>
MINIO_ROOT_PASSWORD=<strong-random-password>

REDIS_URL=redis://redis:6379
```

## Database Connection

### From host machine (development)
```
Host: localhost
Port: 5432
Database: the_rooms
User: therooms
Password: (from .env)
```

### From app container
```
Host: postgres
Port: 5432
Database: the_rooms
User: therooms
```

### pgAdmin (optional)
```bash
docker run --rm \
  --env PGADMIN_DEFAULT_EMAIL=admin@example.com \
  --env PGADMIN_DEFAULT_PASSWORD=admin \
  --publish 5050:80 \
  dpage/pgadmin4
```
Connect via http://localhost:5050 with host `the_rooms_postgres` (or container name from `docker compose ps`).

## Running Migrations

```bash
# On first deploy / schema changes
./scripts/run-migrations.sh

# Manual approach
docker compose exec app npx prisma migrate deploy

# Apply seed data
docker compose exec app npx prisma db seed
```

## Backup Procedure

```bash
# Manual backup
./scripts/backup.sh

# Restore from backup
gunzip -c /path/to/backup.sql.gz | docker compose exec -T postgres psql -U the_rooms the_rooms
```

Backups are gzipped SQL dumps saved to `/backups/postgres/` on the host. Last 14 backups are retained automatically.

## Troubleshooting

### Postgres doesn't start

1. **Check logs**: `docker compose logs postgres`
2. **Port conflict**: Something else using 5432? `lsof -i :5432`
3. **Permission issue**: Check volume ownership: `ls -la ./data/postgres-data/`
4. **Fix**: Stop any conflicting service or change host port mapping in `docker-compose.yml`

### MinIO buckets not created

1. **Check health**: `docker compose logs minio-init`
2. **Wait for init**: The `minio-init` service runs once on startup — check it completed
3. **Retry init**: `docker compose up -d minio-init` (service has `restart: no`, so may need manual restart)
4. **Verify buckets**: Log into http://localhost:9001 console → Buckets

### Redis connection refused

1. **Check health**: `docker compose logs redis`
2. **Verify port**: `docker compose ps` shows 6379 is mapped
3. **Test**: `docker compose exec redis redis-cli ping` → should return `PONG`

### Nginx 502 Bad Gateway

1. **Check upstream services**: Ensure postgres and minio are healthy
2. **Check nginx logs**: `docker compose logs nginx`
3. **Verify config**: `docker compose exec nginx nginx -t`

### Need to reset everything

```bash
# Full reset (destroys all data!)
docker compose down -v
rm -rf ./data
docker compose up -d
./scripts/setup-infra.sh
```

## Security Notes

- Never commit `.env` to version control
- Use strong passwords for Postgres and MinIO
- Keep MinIO buckets private unless public read is explicitly needed
- Certificates in `./certs/` should be mounted from a secure location in production
- Consider using Docker secrets or a secrets manager for production
