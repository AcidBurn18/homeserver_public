#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./ops/restore_db.sh backups/backup.sql

IN_FILE="${1:-}"
if [[ -z "${IN_FILE}" ]]; then
  echo "Usage: $0 <input-file.sql>"
  exit 1
fi

if [[ ! -f "${IN_FILE}" ]]; then
  echo "File not found: ${IN_FILE}"
  exit 1
fi

cat "${IN_FILE}" | docker compose exec -T db psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"
echo "Restored from ${IN_FILE}"

