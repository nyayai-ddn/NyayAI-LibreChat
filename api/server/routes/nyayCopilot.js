/**
 * api/server/routes/nyayCopilot.js
 *
 * Transparent proxy: LibreChat /copilot/* → ai-copilot-service /copilot/*
 *
 * Handles SSE streaming (research responses) — buffers disabled.
 * Uses same JWT exchange as nyayDocuments.js (LibreChat JWT → LPMS JWT via /auth/me).
 */

const express = require('express');
const http    = require('http');
const https   = require('https');
const jwt     = require('jsonwebtoken');

const router = express.Router();

const COPILOT_SERVICE_URL = process.env.COPILOT_SERVICE_URL || 'http://ai-copilot-service:8220';
const MATTER_SERVICE_URL  = process.env.MATTER_SERVICE_URL  || 'http://matter-service:8000';
const JWT_SECRET          = process.env.LPMS_JWT_SECRET || process.env.JWT_SECRET || '';

// Shared token cache (55-min TTL)
const tokenCache = new Map();
const CACHE_TTL_MS = 55 * 60 * 1000;

async function resolveLpmsToken(librechatToken) {
  const cached = tokenCache.get(librechatToken);
  if (cached && cached.expiresAt > Date.now()) return cached.lpmsToken;

  return new Promise((resolve, reject) => {
    const url = new URL(`${MATTER_SERVICE_URL}/api/v1/auth/me`);
    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(
      url,
      { method: 'GET', headers: { authorization: `Bearer ${librechatToken}`, accept: 'application/json' } },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          if (res.statusCode !== 200) return reject(new Error(`/auth/me returned ${res.statusCode}`));
          try {
            const data = JSON.parse(Buffer.concat(chunks).toString());
            const lpmsToken = jwt.sign(
              { sub: data.user_id, firm_id: data.firm_id, firm_role: data.firm_role || 'partner', name: data.name || '' },
              JWT_SECRET,
              { algorithm: 'HS256', expiresIn: '1h' },
            );
            tokenCache.set(librechatToken, { lpmsToken, expiresAt: Date.now() + CACHE_TTL_MS });
            resolve(lpmsToken);
          } catch (e) { reject(e); }
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

function proxyToCopilot(req, res, lpmsToken) {
  const url = new URL(`${COPILOT_SERVICE_URL}/copilot${req.path}`);
  Object.entries(req.query || {}).forEach(([k, v]) => url.searchParams.set(k, v));

  const client = url.protocol === 'https:' ? https : http;
  const isJson = (req.headers['content-type'] || '').includes('application/json');
  const bodyBuffer = (isJson && req.body && Object.keys(req.body).length > 0)
    ? Buffer.from(JSON.stringify(req.body))
    : null;

  const headers = {
    accept: req.headers.accept || 'application/json',
    authorization: `Bearer ${lpmsToken}`,
    // SSE: tell nginx/proxies not to buffer
    'x-accel-buffering': 'no',
    ...(req.headers['content-type'] ? { 'content-type': req.headers['content-type'] } : {}),
    ...(bodyBuffer ? { 'content-length': String(bodyBuffer.length) } : {}),
  };

  const proxyReq = client.request(url, { method: req.method, headers }, (proxyRes) => {
    res.status(proxyRes.statusCode ?? 502);
    // Forward all response headers (important for SSE: Content-Type: text/event-stream)
    Object.entries(proxyRes.headers).forEach(([k, v]) => {
      if (k !== 'transfer-encoding') res.setHeader(k, v);
    });
    // Disable Node response buffering for SSE
    res.flushHeaders();
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    if (!res.headersSent) res.status(502).json({ error: 'copilot service unreachable', detail: err.message });
  });

  if (bodyBuffer) proxyReq.end(bodyBuffer);
  else            proxyReq.end();
}

router.all('*', async (req, res) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Authorization required' });

  try {
    const lpmsToken = await resolveLpmsToken(auth.slice(7));
    proxyToCopilot(req, res, lpmsToken);
  } catch (err) {
    res.status(401).json({ error: 'Could not resolve firm context', detail: err.message });
  }
});

module.exports = router;
