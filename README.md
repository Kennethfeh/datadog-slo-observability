# Datadog SLO Observability Kit

Opinionated starter kit that keeps an instrumented API, Datadog dashboards, monitors, and automation scripts inside one repository. Use it to demonstrate how service code, telemetry assets, and operational runbooks stay aligned.

## Key capabilities

- Express checkout API (`service/`) with tracing (`dd-trace`), StatsD metrics via `hot-shots`, and structured JSON logging (pino).
- Golden dashboards and monitors that watch latency, error budgets, and burn rates.
- Shell scripts for deployment events and synthetic checks so releases are annotated inside Datadog automatically.

## Repository layout

| Path | Description |
| --- | --- |
| `service/` | Node.js API exposing `/api/checkout`, `/api/orders`, `/slo/error-budget`, and `/healthz`. Ships Jest-style tests, linting, and environment-driven metadata (`APP_VERSION`, `DD_ENV`). |
| `monitors/*.json` | JSON payloads for Datadog monitors (p95 latency, error-budget burn alerts). Import via API or UI. |
| `dashboards/slo-overview.json` | High-signal dashboard showing latency, error budget, and deployment timeline. |
| `scripts/publish-deployment-event.sh` | Bash helper to send deployment events tied to service/env/version tags. |
| `scripts/synthetic-check.sh` | Curl-based synthetic probe to exercise `/healthz` + `/api/checkout` and fail fast when regressions appear. |

## Prerequisites

- Node.js 18+
- Datadog account with API + application keys
- Local Datadog Agent or Docker container for StatsD/traces (`DD_AGENT_HOST`, `DD_DOGSTATSD_PORT`)

## Local development

```bash
cd service
npm install
npm run dev

# exercise the API
curl -X POST http://localhost:4600/api/checkout \
  -H 'Content-Type: application/json' \
  -d '{"items":["sku-1"],"total":42.99}'
```

Export Datadog variables when running locally:

```bash
export DD_SERVICE=checkout-api DD_ENV=dev APP_VERSION=1.0.0
export DD_AGENT_HOST=127.0.0.1 DD_DOGSTATSD_PORT=8125
npm run dev
```

## Tests & CI

- `npm test` – Node test runner + Supertest verifying `/healthz` and checkout logic.
- `npm run lint` – StandardJS linting ruleset.
- `.github/workflows/portfolio.yml` contains the `datadog_slo_observability` job that runs install → lint → test to keep the codebase healthy before shipping dashboards/monitors.

## Importing the dashboards + monitors

```bash
# Dashboard
curl -X POST \
  "https://api.datadoghq.com/api/v1/dashboard" \
  -H "DD-API-KEY: $DD_API_KEY" \
  -H "DD-APPLICATION-KEY: $DD_APP_KEY" \
  -H 'Content-Type: application/json' \
  -d @dashboards/slo-overview.json

# Monitors
for file in monitors/*.json; do
  curl -X POST "https://api.datadoghq.com/api/v1/monitor" \
    -H "DD-API-KEY: $DD_API_KEY" \
    -H "DD-APPLICATION-KEY: $DD_APP_KEY" \
    -H 'Content-Type: application/json' \
    -d @"$file"
done
```

The monitor JSON assumes metrics named `checkout.request_duration_ms` and `checkout.requests` emitted by the API.

## Deployment event automation

Annotate dashboards whenever a new build goes live:

```bash
export DD_API_KEY=... DD_APP_KEY=...
./scripts/publish-deployment-event.sh \
  SERVICE=checkout-api \
  ENVIRONMENT=prod \
  VERSION=$(git rev-parse --short HEAD)
```

Tags set here (`service`, `env`, `version`) match those used in traces/metrics/logs for instant correlation.

## Observability story

1. Application emits traces + StatsD metrics for each checkout request.
2. Datadog Agent collects telemetry and ships it to Datadog.
3. Dashboards visualise latency/error budgets; monitors alert on burn rates.
4. Synthetic script ensures `/healthz` and `/api/checkout` continue to succeed after each deploy.
5. Deployment events keep context so incidents can be correlated with code pushes.

Treat this repo as the canonical example of “code + dashboards + automation” packaged together. Swap the service logic for your own workload while keeping the operational scaffolding intact.
