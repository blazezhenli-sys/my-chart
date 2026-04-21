#!/bin/sh
set -eu

# Use a plain filesystem path for SQLite by default, then derive Prisma DATABASE_URL.
SQLITE_FILE_PATH="${SQLITE_FILE_PATH:-/var/lib/nfp/nfp.db}"

if [ -z "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="file:${SQLITE_FILE_PATH}"
fi

if [ "${DATABASE_URL#file:}" != "${DATABASE_URL}" ]; then
  db_path="${DATABASE_URL#file:}"
  case "$db_path" in
    /*)
      mkdir -p "$(dirname "$db_path")"
      ;;
    *)
      mkdir -p "$(dirname "/app/$db_path")"
      ;;
  esac
fi

echo "Starting with DATABASE_URL=${DATABASE_URL}"
exec "$@"
