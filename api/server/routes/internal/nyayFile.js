/**
 * api/server/routes/internal/nyayFile.js
 *
 * Internal service-to-service route for reading NyayAI-managed files out of
 * the LibreChat File Manager.  Used by the NyayAI Litigation Backend's
 * context_injector to fetch CLAUDE.md / case.md for system-prompt injection.
 *
 * Protected by NYAY_SERVICE_KEY — never expose to the public internet.
 * Export: factory function — call require('./routes/internal/nyayFile')(appConfig)
 *
 * GET /api/internal/nyay-file
 *   ?user_id=<mongo-user-id>
 *   &filename=<e.g. CLAUDE.md>
 *   [&folder_name=<leaf folder name, e.g. "Practice Profile">]
 *
 * Returns: { content: "<text>", filename, source }
 *          404 if not found
 */

const express = require('express');
const { getFiles } = require('~/models/File');
const { getStrategyFunctions } = require('~/server/services/Files/strategies');

// ── Service key guard ──────────────────────────────────────────────────────────
function requireServiceKey(req, res, next) {
  const serviceKey = process.env.NYAY_SERVICE_KEY;
  if (!serviceKey) {
    return res.status(503).json({ error: 'NYAY_SERVICE_KEY not configured on server.' });
  }
  const provided = req.headers['x-nyay-service-key'];
  if (!provided || provided !== serviceKey) {
    return res.status(401).json({ error: 'Invalid or missing service key.' });
  }
  next();
}

/**
 * Factory: returns the Express router, wired to the active file storage strategy.
 * @param {import('~/config/AppConfig').AppConfig} appConfig
 */
module.exports = function createNyayFileRouter(appConfig) {
  const router = express.Router();

  // ── GET /api/internal/nyay-file ────────────────────────────────────────────
  router.get('/nyay-file', requireServiceKey, async (req, res) => {
    try {
      const { user_id, filename } = req.query;

      if (!user_id || !filename) {
        return res.status(400).json({ error: 'user_id and filename are required.' });
      }

      // Find the most recent file matching user + filename.
      const files = await getFiles(
        { user: user_id, filename },
        { createdAt: -1 },
        { file_id: 1, filepath: 1, source: 1, filename: 1 },
      );

      if (!files || files.length === 0) {
        return res.status(404).json({ error: `File not found: ${filename}` });
      }

      const fileRecord = files[0];
      const { getDownloadStream } = getStrategyFunctions(fileRecord.source);

      // Build a minimal mock request so strategy stream helpers have what they need.
      const mockReq = {
        config: appConfig,
        user: { id: user_id },
      };

      const stream = await getDownloadStream(mockReq, fileRecord.filepath);

      // Collect the readable stream into a buffer, then decode as UTF-8 text.
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const content = Buffer.concat(chunks).toString('utf8');

      return res.status(200).json({
        content,
        filename: fileRecord.filename,
        source:   fileRecord.source,
      });
    } catch (err) {
      console.error('[nyayFile] error:', err);
      return res.status(500).json({ error: err.message || 'Unexpected error.' });
    }
  });

  return router;
};
