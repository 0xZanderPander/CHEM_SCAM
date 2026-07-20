#!/bin/sh
set -eu

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${BACKUP_ENCRYPTION_RECIPIENT:?BACKUP_ENCRYPTION_RECIPIENT is required}"

backup_dir="${BACKUP_DIR:-./backups}"
retention_days="${BACKUP_RETENTION_DAYS:-14}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
output="${backup_dir}/chem-scam-${timestamp}.sql.gz.age"
temporary="${output}.partial"

mkdir -p "$backup_dir"
command -v age >/dev/null 2>&1 || { echo "age is required" >&2; exit 1; }

docker compose exec -T postgres pg_dump --clean --if-exists --no-owner -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip -9 \
  | age -r "$BACKUP_ENCRYPTION_RECIPIENT" -o "$temporary"

test -s "$temporary"
mv "$temporary" "$output"
find "$backup_dir" -type f -name 'chem-scam-*.sql.gz.age' -mtime "+$retention_days" -delete
echo "Encrypted backup created: $output"
