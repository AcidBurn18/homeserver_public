#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./ops/backup_db.sh backups/backup.sql
#
# Runs pg_dump inside the db container.

OUT_FILE="${1:-}"
if [[ -z "${OUT_FILE}" ]]; then
  echo "Usage: $0 <output-file.sql>"
  exit 1
fi

mkdir -p "$(dirname "${OUT_FILE}")"

docker compose exec -T db pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" > "${OUT_FILE}"
echo "Wrote ${OUT_FILE}"

