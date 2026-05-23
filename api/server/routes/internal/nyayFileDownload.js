/**
 * api/server/routes/internal/nyayFileDownload.js
 *
 * Internal service-to-service file download route.
 * Called by the NyayAI OCR Service to fetch raw PDF bytes from the FM.
 *
 * Protected by NYAY_SERVICE_KEY — never expose to the public internet.
 *
 * GET /api/internal/file-download/:file_id
 *   Headers: x-nyay-service-key: <NYAY_SERVICE_KEY>
 *   Returns: raw file bytes (application/octet-stream) or 404
 */

const express = require('express');
const { findFileById } = require('~/models/File');
const { getStrategyFunctions } = require('~/server/services/Files/strategies');

function requireServiceKey(req, res, next) {
  const serviceKey = process.env.NYAY_SERVICE_KEY;
  if (!serviceKey) {
    return res.status(503).json({ error: 'NYAY_SERVICE_KEY not configured.' });
  }
  if (req.headers['x-nyay-service-key'] !== serviceKey) {
    return res.status(401).json({ error: 'Invalid service key.' });
  }
  next();
}

module.exports = function createNyayFileDownloadRouter(appConfig) {
  const router = express.Router();

  router.get('/file-download/:file_id', requireServiceKey, async (req, res) => {
    try {
      const { file_id } = req.params;

      const file = await findFileById(file_id);
      if (!file) {
        return res.status(404).json({ error: `File not found: ${file_id}` });
      }

      const mockReq = { config: appConfig, user: { id: file.user?.toString() } };
      const { getDownloadStream } = getStrategyFunctions(file.source);

      if (!getDownloadStream) {
        return res.status(500).json({ error: `No download stream for source: ${file.source}` });
      }

      const stream = await getDownloadStream(mockReq, file.filepath);

      res.setHeader('Content-Type', file.type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.filename)}"`);

      // Handle both Node.js Readable and Web streams
      if (stream && typeof stream.pipe === 'function') {
        stream.pipe(res);
        stream.on('error', (err) => {
          if (!res.headersSent) res.status(500).json({ error: err.message });
        });
      } else if (stream && typeof stream[Symbol.asyncIterator] === 'function') {
        for await (const chunk of stream) {
          res.write(chunk);
        }
        res.end();
      } else {
        return res.status(500).json({ error: 'Cannot stream file from storage.' });
      }
    } catch (err) {
      console.error('[nyayFileDownload] error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || 'Unexpected error.' });
      }
    }
  });

  // GET /api/internal/file-content/:file_id
  // Returns the raw text content of an FM file.
  // Used by the OCR service translate/summary actions to read their input.
  router.get('/file-content/:file_id', requireServiceKey, async (req, res) => {
    try {
      const { file_id } = req.params;
      const file = await findFileById(file_id);
      if (!file) {
        return res.status(404).json({ error: `File not found: ${file_id}` });
      }

      const { getDownloadStream } = getStrategyFunctions(file.source);
      if (!getDownloadStream) {
        return res.status(500).json({ error: `No download stream for source: ${file.source}` });
      }

      const mockReq = { config: appConfig, user: { id: file.user?.toString() } };
      const stream  = await getDownloadStream(mockReq, file.filepath);

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');

      if (stream && typeof stream.pipe === 'function') {
        stream.pipe(res);
        stream.on('error', (err) => {
          if (!res.headersSent) res.status(500).json({ error: err.message });
        });
      } else if (stream && typeof stream[Symbol.asyncIterator] === 'function') {
        for await (const chunk of stream) res.write(chunk);
        res.end();
      } else {
        return res.status(500).json({ error: 'Cannot stream file from storage.' });
      }
    } catch (err) {
      console.error('[file-content] error:', err);
      if (!res.headersSent) res.status(500).json({ error: err.message || 'Unexpected error.' });
    }
  });

  return router;
};
