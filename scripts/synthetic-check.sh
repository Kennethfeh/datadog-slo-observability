#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://localhost:4600}

curl -fsS "$BASE_URL/healthz" >/dev/null
curl -fsS -X POST "$BASE_URL/api/checkout" \
  -H 'Content-Type: application/json' \
  -d '{"items": ["sku-123"], "total": 19.5}' >/dev/null

if command -v datadog-agent >/dev/null 2>&1; then
  datadog-agent flare --send || true
fi

echo "Synthetic check completed for $BASE_URL"
