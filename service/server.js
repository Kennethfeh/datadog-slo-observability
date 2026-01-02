const express = require('express');
const pino = require('pino');
const { StatsD } = require('hot-shots');
const tracer = require('dd-trace').init({
  service: process.env.DD_SERVICE || 'checkout-api',
  env: process.env.DD_ENV || 'dev',
  version: process.env.APP_VERSION || '1.0.0',
  logInjection: true,
  analytics: true
});

const logger = pino({
  name: 'checkout-api',
  level: process.env.LOG_LEVEL || 'info'
});

const statsd = new StatsD({
  host: process.env.DD_AGENT_HOST || '127.0.0.1',
  port: Number(process.env.DD_DOGSTATSD_PORT) || 8125,
  globalTags: {
    service: process.env.DD_SERVICE || 'checkout-api',
    env: process.env.DD_ENV || 'dev'
  }
});
statsd.socket.on('error', (err) => {
  logger.warn({ err }, 'Datadog agent unreachable');
});

const latencySamples = [];
const orders = [];
let requestCount = 0;
let errorCount = 0;

const recordSample = (duration, success) => {
  requestCount += 1;
  if (!success) errorCount += 1;
  latencySamples.push(duration);
  if (latencySamples.length > 200) latencySamples.shift();
  statsd.histogram('checkout.request_duration_ms', duration);
  statsd.increment('checkout.requests', 1, success ? [] : ['outcome:error']);
};

const createApp = () => {
  const app = express();
  app.use(express.json());

  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok', env: process.env.DD_ENV || 'dev', version: process.env.APP_VERSION || '1.0.0' });
  });

  app.post('/api/checkout', async (req, res) => {
    const span = tracer.startSpan('checkout.submit');
    const start = process.hrtime.bigint();
    try {
      const { items = [], total } = req.body || {};
      if (!Array.isArray(items) || typeof total !== 'number') {
        span.setTag('error', true);
        throw new Error('Invalid payload');
      }
      const processingTime = Math.random() * 120 + 30;
      await new Promise((resolve) => setTimeout(resolve, processingTime));
      const orderId = `ord_${Date.now()}`;
      const order = { id: orderId, items, total, createdAt: new Date().toISOString() };
      orders.push(order);
      if (orders.length > 50) orders.shift();
      statsd.increment('checkout.orders_created');
      logger.info({ orderId, total, itemCount: items.length }, 'Order completed');
      span.setTag('order.id', orderId);
      span.finish();
      const duration = Number(process.hrtime.bigint() - start) / 1e6;
      recordSample(duration, true);
      res.status(201).json(order);
    } catch (err) {
      logger.error({ err }, 'Checkout failure');
      span.setTag('error', true);
      span.finish();
      const duration = Number(process.hrtime.bigint() - start) / 1e6;
      recordSample(duration, false);
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/orders', (_req, res) => {
    res.json(orders.slice(-25));
  });

  app.get('/slo/error-budget', (_req, res) => {
    const totalRequests = requestCount || 1;
    const errorRate = errorCount / totalRequests;
    const p95 = [...latencySamples].sort((a, b) => a - b)[Math.floor(latencySamples.length * 0.95)] || 0;
    res.json({
      totalRequests,
      errorRate: Number(errorRate.toFixed(4)),
      p95LatencyMs: Number(p95.toFixed(2)),
      remainingBudget: Number(Math.max(0, 0.02 - errorRate).toFixed(4))
    });
  });

  return app;
};

const port = process.env.PORT || 4600;

if (require.main === module) {
  const app = createApp();
  app.listen(port, () => {
    logger.info({ port }, 'Checkout API with Datadog instrumentation listening');
  });
}

module.exports = { createApp };
