#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DD_API_KEY:-}" || -z "${DD_APP_KEY:-}" ]]; then
  echo "Set DD_API_KEY and DD_APP_KEY before publishing" >&2
  exit 1
fi

SERVICE=${SERVICE:-checkout-api}
ENVIRONMENT=${ENVIRONMENT:-staging}
VERSION=${VERSION:-$(git rev-parse --short HEAD)}

curl -sS -X POST "https://api.datadoghq.com/api/v1/events" \
  -H "DD-API-KEY: $DD_API_KEY" \
  -H "DD-APPLICATION-KEY: $DD_APP_KEY" \
  -H 'Content-Type: application/json' \
  -d @- <<JSON
{
  "title": "${SERVICE} deployment ${VERSION}",
  "text": "${SERVICE} ${VERSION} deployed to ${ENVIRONMENT}.\nCI: ${CI_JOB_URL:-local}",
  "tags": ["service:${SERVICE}", "env:${ENVIRONMENT}"],
  "aggregation_key": "${SERVICE}-${ENVIRONMENT}-deployments"
}
JSON
