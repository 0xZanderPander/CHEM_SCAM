#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 BACKUP.sql.gz.age" >&2
  exit 2
fi
if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${AGE_IDENTITY_FILE:?AGE_IDENTITY_FILE is required}"

backup="$1"
test -s "$backup" || { echo "Backup not found or empty: $backup" >&2; exit 1; }
command -v age >/dev/null 2>&1 || { echo "age is required" >&2; exit 1; }

echo "This replaces the current ${POSTGRES_DB} database contents. Type RESTORE to continue:"
read -r confirmation
[ "$confirmation" = "RESTORE" ] || { echo "Restore cancelled"; exit 1; }

age -d -i "$AGE_IDENTITY_FILE" "$backup" \
  | gzip -dc \
  | docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" "$POSTGRES_DB"

echo "Restore completed. Run the health and application checks now."

