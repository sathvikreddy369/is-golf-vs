#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${BACKEND_URL:-}" ]]; then
  echo "Missing BACKEND_URL, e.g. https://golf-charity-backend.onrender.com"
  exit 1
fi

if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "Missing CRON_SECRET"
  exit 1
fi

curl --fail-with-body -X POST \
  -H "x-cron-secret: ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  "${BACKEND_URL}/api/internal/cron/monthly-draw"

echo "Monthly draw trigger sent successfully."
