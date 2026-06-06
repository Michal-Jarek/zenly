#!/bin/sh
# Database backup: pg_dump (custom format) from the Compose `db` container into backups/.
# Manual ops tool — intentionally NOT wired into the Docker build or entrypoint.
#
# Usage: npm run db:backup   (or: sh scripts/db-backup.sh)
set -e

mkdir -p backups
OUT="backups/zenly_$(date +%Y%m%d_%H%M%S).dump"

# Run pg_dump inside the db container so the tool version matches Postgres 17. Credentials come from
# the container env ($POSTGRES_USER/$POSTGRES_DB), expanded inside the container (single quotes).
# -T keeps the binary stream intact (no TTY mangling of the -Fc dump).
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$OUT"

echo "[db:backup] Wrote $OUT"
