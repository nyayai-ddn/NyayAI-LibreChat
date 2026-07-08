/**
 * api/server/routes/nyayDocuments.js
 *
 * Transparent proxy: LibreChat /documents/* → document-service /documents/*
 *
 * The document-service requires an LPMS JWT (firm_id + sub claims), but the
 * browser sends a LibreChat JWT (company_slug + id claims). This proxy:
 *  1. Calls matter-service /api/v1/auth/me with the LibreChat JWT to get
 *     the resolved firm_id and user_id.
 *  2. Mints a short-lived LPMS JWT signed with JWT_SECRET.
 *  3. Forwards the request to document-service using the LPMS JWT.
 *
 * The resolved token is cached per LibreChat token (1 hour TTL) so only
 * the first request per session pays the matter-service round-trip.
 */

const express  = require('express');
const http     = require('http');
const https    = require('https');
const jwt      = require('jsonwebtoken');

const router = express.Router();

const DOCUMENT_SERVICE_URL = process.env.DOCUMENT_SERVICE_URL || 'http://document-service:8230';
const MATTER_SERVICE_URL   = process.env.MATTER_SERVICE_URL   || 'http://matter-service:8000';
const JWT_SECRET           = process.env.LPMS_JWT_SECRET || process.env.JWT_SECRET || '';

// Simple in-memory cache: librechat_token → { lpmsToken, expiresAt }
const tokenCache = new Map();
const CACHE_TTL_MS = 55 * 60 * 1000; // 55 minutes

async function resolveLpmsToken(librechatToken) {
  const cached = tokenCache.get(librechatToken);
  if (cached && cached.expiresAt > Date.now()) return cached.lpmsToken;

  // Call matter-service /auth/me to resolve firm context
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
          if (res.statusCode !== 200) {
            return reject(new Error(`/auth/me returned ${res.statusCode}`));
          }
          try {
            const data = JSON.parse(Buffer.concat(chunks).toString());
            // Mint a short-lived LPMS JWT with the claims document-service expects
            const lpmsToken = jwt.sign(
              { sub: data.user_id, firm_id: data.firm_id, firm_role: data.firm_role || 'partner', name: data.name || '' },
              JWT_SECRET,
              { algorithm: 'HS256', expiresIn: '1h' },
            );
            tokenCache.set(librechatToken, { lpmsToken, expiresAt: Date.now() + CACHE_TTL_MS });
            resolve(lpmsToken);
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

function proxyToDocuments(req, res, lpmsToken) {
  const url = new URL(`${DOCUMENT_SERVICE_URL}/documents${req.path}`);
  Object.entries(req.query || {}).forEach(([k, v]) => url.searchParams.set(k, v));

  const client = url.protocol === 'https:' ? https : http;
  const isMultipart = (req.headers['content-type'] || '').includes('multipart/form-data');
  const isJson = (req.headers['content-type'] || '').includes('application/json');

  function sendRequest(bodyBuffer) {
    const headers = {
      accept: 'application/json',
      authorization: `Bearer ${lpmsToken}`,
      ...(req.headers['content-type'] ? { 'content-type': req.headers['content-type'] } : {}),
      ...(bodyBuffer ? { 'content-length': String(bodyBuffer.length) } : {}),
    };

    const proxyReq = client.request(url, { method: req.method, headers }, (proxyRes) => {
      res.status(proxyRes.statusCode ?? 502);
      const ct = proxyRes.headers['content-type'];
      if (ct) res.setHeader('Content-Type', ct);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      if (!res.headersSent) res.status(502).json({ error: 'document-service unreachable', detail: err.message });
    });

    if (bodyBuffer) proxyReq.end(bodyBuffer);
    else            proxyReq.end();
  }

  if (isMultipart) {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => sendRequest(chunks.length ? Buffer.concat(chunks) : null));
  } else if (isJson && req.body && Object.keys(req.body).length > 0) {
    sendRequest(Buffer.from(JSON.stringify(req.body)));
  } else {
    sendRequest(null);
  }
}

router.all('*', async (req, res) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  const librechatToken = auth.slice(7);

  try {
    const lpmsToken = await resolveLpmsToken(librechatToken);
    proxyToDocuments(req, res, lpmsToken);
  } catch (err) {
    res.status(401).json({ error: 'Could not resolve firm context', detail: err.message });
  }
});

module.exports = router;
