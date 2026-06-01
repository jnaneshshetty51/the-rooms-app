#!/bin/bash
BACKUP_DIR="/backups/postgres/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
docker compose exec -T postgres pg_dump -U the_rooms the_rooms > "$BACKUP_DIR/the_rooms.sql"
gzip "$BACKUP_DIR/the_rooms.sql"
echo "Backup saved: $BACKUP_DIR/the_rooms.sql.gz"
# Keep last 14 backups
find /backups/postgres -name "*.sql.gz" -mtime +14 -delete
