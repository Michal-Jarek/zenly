#!/bin/sh
set -e

echo "[entrypoint] Applying migrations (prisma migrate deploy)..."
npx prisma migrate deploy

echo "[entrypoint] Seeding database (prisma db seed)..."
npx prisma db seed

echo "[entrypoint] Starting Next.js (next start)..."
exec npx next start -H 0.0.0.0 -p 3000
