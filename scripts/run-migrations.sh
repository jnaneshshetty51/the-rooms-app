#!/bin/bash
set -e
echo "Running database migrations..."
npx prisma migrate deploy
echo "Running seed data..."
npx prisma db seed
echo "Migration complete!"
