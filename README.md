# Datadog SLO Observability

This project demonstrates how I wire an API, Datadog instrumentation, and SLO collateral together. It includes a small checkout service, StatsD metrics, tracing via `dd-trace`, dashboards, monitors, and scripts for deployment events.

## What's inside

| Path | Description |
| --- | --- |
| `service/` | Express API instrumented with `dd-trace`, `hot-shots` (StatsD), and `pino`. Routes include `/api/checkout`, `/api/orders`, `/slo/error-budget`, and `/healthz`. |
| `monitors/*.json` | Example Datadog monitor payloads for p95 latency and error-budget burn alerts. Import directly via the Datadog API/UI. |
| `dashboards/slo-overview.json` | Dashboard definition showing latency, error budget, and recent order logs. |
| `scripts/publish-deployment-event.sh` | Helper to send deployment events to Datadog's event stream (requires `DD_API_KEY`/`DD_APP_KEY`). |
| `scripts/synthetic-check.sh` | cURL-based synthetic test that exercises `/healthz` and `/api/checkout`; adapt for Datadog Synthetics.

## Running locally

```bash
cd service
npm install
npm run dev
# in another terminal
curl -X POST http://localhost:4600/api/checkout \
  -H 'Content-Type: application/json' \
  -d '{"items": ["sku-1"], "total": 19.5}'
```

The service emits traces, StatsD metrics (`checkout.request_duration_ms`, `checkout.orders_created`), and structured logs. Point `DD_AGENT_HOST` to a local Datadog Agent container or leave it at `127.0.0.1` if you have an agent installed.

## Tests & CI

`npm test` uses Node's test runner and Supertest to verify health + checkout flows. The `datadog_slo_observability` job in `.github/workflows/portfolio.yml` installs dependencies and runs the tests on GitHub Actions.

## Deploying + publishing events

Before promoting a new build, send a deployment event so dashboards can correlate incidents with releases:

```bash
export DD_API_KEY=... DD_APP_KEY=...
./scripts/publish-deployment-event.sh SERVICE=checkout-api ENVIRONMENT=prod VERSION=$(git rev-parse --short HEAD)
```

## Dashboard & monitor import

1. Use the Datadog API or UI to import `dashboards/slo-overview.json`.
2. Create monitors with the JSON files under `monitors/`. They assume metrics named `checkout.request_duration_ms` and `checkout.requests`—exactly what the service emits via StatsD.

## Why it matters

Recruiters and hiring managers can see how I turn instrumentation requirements into runnable assets: app code, monitors, dashboards, and runbooks all live together. Drop this into your own Datadog org to demo SLO reporting, latency alerting, and deployment correlations.
