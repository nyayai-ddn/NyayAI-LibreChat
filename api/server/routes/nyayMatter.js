/**
 * api/server/routes/nyayMatter.js
 *
 * Transparent proxy: LibreChat /api/v1/* → matter-service /api/v1/*
 *
 * Forwards the LibreChat JWT as-is so matter-service can validate it.
 * Matter-service must share JWT_SECRET with LibreChat (set in .env).
 */

const express = require('express');
const http    = require('http');
const https   = require('https');

const router = express.Router();

const MATTER_SERVICE_URL =
  process.env.MATTER_SERVICE_URL || 'http://matter-service:8000';

function proxyToMatter(req, res) {
  const url = new URL(`${MATTER_SERVICE_URL}/api/v1${req.path}`);

  // Forward query string
  Object.entries(req.query || {}).forEach(([k, v]) => url.searchParams.set(k, v));

  const client = url.protocol === 'https:' ? https : http;

  // Express's json() middleware already parsed the body into req.body.
  // Re-serialise it so the downstream service receives valid JSON.
  const hasBody = req.body !== undefined && req.body !== null &&
                  Object.keys(req.body).length > 0;
  const bodyBuffer = hasBody ? Buffer.from(JSON.stringify(req.body)) : null;

  const headers = {
    'content-type': 'application/json',
    accept: 'application/json',
    ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}),
    ...(bodyBuffer ? { 'content-length': String(bodyBuffer.length) } : {}),
  };

  const proxyReq = client.request(url, { method: req.method, headers }, (proxyRes) => {
    res.status(proxyRes.statusCode ?? 502);
    res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'application/json');
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    if (!res.headersSent) {
      res.status(502).json({ error: 'matter-service unreachable', detail: err.message });
    }
  });

  if (bodyBuffer) proxyReq.end(bodyBuffer);
  else            proxyReq.end();
}

router.all('*', proxyToMatter);

module.exports = router;
