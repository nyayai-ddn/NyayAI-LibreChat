/**
 * api/server/routes/nyayOcr.js
 *
 * User-facing proxy routes for the NyayAI OCR Service.
 * Authenticated via LibreChat JWT (requireJwtAuth). The proxy injects:
 *   - x-nyay-service-key (server-side secret — never exposed to the browser)
 *   - user_id from req.user.id (client cannot spoof another user's identity)
 *   - file_download_url constructed server-side for the OCR action
 *
 * Routes:
 *   POST /api/nyay/ocr/action
 *     Body: { parent_file_id, filename, action, source_lang?, target_lang? }
 *     → POST /v1/ocr/action (injects user_id + file_download_url)
 *
 *   GET /api/nyay/ocr/job/:job_id
 *     → GET /v1/ocr/job/:job_id
 *
 *   GET /api/nyay/ocr/jobs/:parent_file_id
 *     → GET /v1/ocr/jobs/:parent_file_id
 */

const express = require('express');
const http    = require('http');
const https   = require('https');

const { requireJwtAuth } = require('~/server/middleware');

const router = express.Router();

const OCR_SERVICE_BASE =
  process.env.OCR_SERVICE_URL ||
  (process.env.HOST_DOCKER_INTERNAL
    ? `http://${process.env.HOST_DOCKER_INTERNAL}:8100`
    : 'http://host.docker.internal:8100');

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeServiceHeaders() {
  return {
    'x-nyay-service-key': process.env.NYAY_SERVICE_KEY || '',
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

function proxyJson(res, targetUrl, method, body) {
  const url    = new URL(targetUrl);
  const client = url.protocol === 'https:' ? https : http;
  const bodyBuffer = body ? Buffer.from(JSON.stringify(body)) : null;

  const headers = {
    ...makeServiceHeaders(),
    ...(bodyBuffer ? { 'content-length': String(bodyBuffer.length) } : {}),
  };

  const proxyReq = client.request(url, { method, headers }, (proxyRes) => {
    res.status(proxyRes.statusCode ?? 502);
    res.setHeader('Content-Type', 'application/json');
    const chunks = [];
    proxyRes.on('data', (c) => chunks.push(c));
    proxyRes.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      try { res.json(JSON.parse(raw)); } catch { res.send(raw); }
    });
  });

  proxyReq.on('error', (err) => {
    if (!res.headersSent) {
      res.status(502).json({ error: 'OCR service unreachable', detail: err.message });
    }
  });

  if (bodyBuffer) proxyReq.end(bodyBuffer);
  else            proxyReq.end();
}

// ── Routes ─────────────────────────────────────────────────────────────────────

router.use(requireJwtAuth);

// POST /api/nyay/ocr/action
router.post('/action', (req, res) => {
  const { parent_file_id, filename, action, source_lang, target_lang } = req.body || {};

  if (!parent_file_id || !filename || !action) {
    return res.status(400).json({ error: 'parent_file_id, filename, and action are required.' });
  }

  const librechatPort = process.env.PORT || 3080;
  const librechatHost = process.env.LIBRECHAT_INTERNAL_HOST || 'LibreChat';
  const file_download_url =
    `http://${librechatHost}:${librechatPort}/api/internal/file-download/${parent_file_id}`;

  const body = {
    parent_file_id,
    filename,
    action,
    file_download_url,
    user_id: req.user.id,
    ...(source_lang ? { source_lang } : {}),
    ...(target_lang ? { target_lang } : {}),
  };

  proxyJson(res, `${OCR_SERVICE_BASE}/v1/ocr/action`, 'POST', body);
});

// GET /api/nyay/ocr/job/:job_id
router.get('/job/:job_id', (req, res) => {
  proxyJson(res, `${OCR_SERVICE_BASE}/v1/ocr/job/${req.params.job_id}`, 'GET', null);
});

// GET /api/nyay/ocr/jobs/:parent_file_id
router.get('/jobs/:parent_file_id', (req, res) => {
  proxyJson(res, `${OCR_SERVICE_BASE}/v1/ocr/jobs/${req.params.parent_file_id}`, 'GET', null);
});

module.exports = router;
