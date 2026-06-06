#!/bin/sh
# Database restore: pg_restore from a custom-format dump into the Compose `db` container.
# Manual ops tool — intentionally NOT wired into the Docker build or entrypoint.
#
# Usage: npm run db:restore -- backups/zenly_<timestamp>.dump
#    (or: sh scripts/db-restore.sh backups/zenly_<timestamp>.dump)
#
# WARNING: this REPLACES current data with the dump's snapshot (objects are dropped and recreated).
set -e

FILE="$1"
if [ -z "$FILE" ]; then
  echo "Usage: npm run db:restore -- <backups/file.dump>" >&2
  exit 1
fi
if [ ! -f "$FILE" ]; then
  echo "[db:restore] File not found: $FILE" >&2
  exit 1
fi

# --single-transaction makes the restore all-or-nothing; --clean --if-exists drops existing objects
# first (quietly when absent). Expansion happens inside the container (single quotes); -T keeps the
# binary stream intact.
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --single-transaction' < "$FILE"

echo "[db:restore] Restored from $FILE"
