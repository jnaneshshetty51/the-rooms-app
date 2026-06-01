#!/bin/bash
# The Rooms — Infrastructure bootstrap script
# Creates directories, sets up .env, starts services, runs migrations

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "=========================================="
echo " The Rooms — Infrastructure Setup"
echo "=========================================="

# 1. Create required directories
echo ""
echo "[1/5] Creating directory structure..."
mkdir -p ./data/postgres ./data/redis ./data/minio
mkdir -p ./backups/postgres
mkdir -p ./nginx/conf.d ./certs
mkdir -p ./logs
echo "      Directories created."

# 2. Set up environment files
echo ""
echo "[2/5] Setting up environment..."
if [ ! -f .env ]; then
    if [ -f .env.production ]; then
        cp .env.production .env
        echo "      .env created from template."
        echo "      ⚠️  EDIT .env WITH YOUR SECURE PASSWORDS before continuing!"
    else
        cat > .env << 'EOF'
POSTGRES_USER=therooms
POSTGRES_PASSWORD=change-me-in-.env
DATABASE_URL=postgresql://therooms:change-me-in-.env@postgres:5432/the_rooms
MINIO_ROOT_USER=therooms
MINIO_ROOT_PASSWORD=change-me-in-.env
REDIS_URL=redis://redis:6379
EOF
        echo "      .env created with defaults."
    fi
else
    echo "      .env already exists — skipping."
fi

# 3. Make scripts executable
echo ""
echo "[3/5] Setting script permissions..."
chmod +x "$SCRIPT_DIR"/run-migrations.sh
chmod +x "$SCRIPT_DIR"/backup.sh
echo "      Scripts made executable."

# 4. Start infrastructure services
echo ""
echo "[4/5] Starting Docker services..."
docker compose up -d
echo "      Services started."

# 5. Wait for postgres to be healthy, then run migrations
echo ""
echo "[5/5] Waiting for services to be healthy..."
echo "      (This takes ~15-30 seconds)"

MAX_WAIT=60
WAITED=0
while ! docker compose exec -T postgres pg_isready -U the_rooms > /dev/null 2>&1; do
    if [ $WAITED -ge $MAX_WAIT ]; then
        echo ""
        echo "      ERROR: Postgres did not become healthy in ${MAX_WAIT}s"
        echo "      Check logs: docker compose logs postgres"
        exit 1
    fi
    echo "      Waiting for postgres... ($WAITED/${MAX_WAIT}s)"
    sleep 5
    WAITED=$((WAITED + 5))
done
echo "      Postgres is ready."

# Run migrations
echo ""
echo "      Running migrations..."
docker compose run --rm app npx prisma migrate deploy || {
    echo "      WARNING: Migration failed. This is OK if Prisma is not installed yet."
    echo "      Run manually: ./scripts/run-migrations.sh"
}
docker compose run --rm app npx prisma db seed || {
    echo "      WARNING: Seeding failed. This is OK if no seed script exists yet."
}

echo ""
echo "=========================================="
echo " Infrastructure setup complete!"
echo "=========================================="
echo ""
echo "Services:"
docker compose ps
echo ""
echo "Next steps:"
echo "  1. Edit .env with your secure passwords"
echo "  2. Access MinIO Console: http://localhost:9001"
echo "  3. View logs: docker compose logs -f"
echo "  4. Connect DB: docker compose exec postgres psql -U the_rooms -d the_rooms"
