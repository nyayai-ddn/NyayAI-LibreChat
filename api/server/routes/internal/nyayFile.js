/**
 * api/server/routes/internal/nyayFile.js
 *
 * Internal service-to-service routes for reading NyayAI-managed files from
 * the LibreChat File Manager. Used by the Litigation Backend for context injection.
 *
 * Protected by NYAY_SERVICE_KEY — never expose to the public internet.
 *
 * GET /api/internal/nyay-file
 *   ?user_id=<mongo-user-id>
 *   &filename=<e.g. case.md>
 *   [&case_slug=<e.g. sharma-v-kapoor-2026>]   — narrows search to that case folder
 *   [&scope=firm]                               — also search firm-scoped files
 *
 * Returns: { content, filename, source, scope, doc_type }   or 404
 *
 * GET /api/internal/nyay-list-docs
 *   ?user_id=<mongo-user-id>
 *   &case_slug=<slug>
 *   [&scope=firm]
 *
 * Returns: { docs: [{ filename, file_id, doc_type, scope, bytes, updatedAt }] }
 */

const express = require('express');
const { getFiles } = require('~/models/File');
const { getUserById } = require('~/models');
const { getStrategyFunctions } = require('~/server/services/Files/strategies');

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

module.exports = function createNyayFileRouter(appConfig) {
  const router = express.Router();

  // ── GET /api/internal/nyay-file ─────────────────────────────────────────────
  router.get('/nyay-file', requireServiceKey, async (req, res) => {
    try {
      const { user_id, filename, case_slug, scope } = req.query;

      if (!user_id || !filename) {
        return res.status(400).json({ error: 'user_id and filename are required.' });
      }

      const fileRecord = await _findFile(user_id, filename, { case_slug, scope });
      if (!fileRecord) {
        return res.status(404).json({ error: `File not found: ${filename}` });
      }

      const content = await _readFileContent(appConfig, user_id, fileRecord);
      return res.status(200).json({
        content,
        filename:  fileRecord.filename,
        source:    fileRecord.source,
        scope:     fileRecord.metadata?.nyay?.scope   ?? 'user',
        doc_type:  fileRecord.metadata?.nyay?.docType ?? null,
      });
    } catch (err) {
      console.error('[nyayFile] error:', err);
      return res.status(500).json({ error: err.message || 'Unexpected error.' });
    }
  });

  // ── GET /api/internal/nyay-list-docs ────────────────────────────────────────
  router.get('/nyay-list-docs', requireServiceKey, async (req, res) => {
    try {
      const { user_id, case_slug, scope } = req.query;

      if (!user_id || !case_slug) {
        return res.status(400).json({ error: 'user_id and case_slug are required.' });
      }

      const filter = await _buildCaseFilter(user_id, case_slug, scope);
      const files  = await getFiles(filter, { updatedAt: -1 }, {
        file_id: 1, filename: 1, bytes: 1, updatedAt: 1, metadata: 1,
      });

      const docs = files.map(f => ({
        file_id:  f.file_id,
        filename: f.filename,
        doc_type: f.metadata?.nyay?.docType ?? null,
        scope:    f.metadata?.nyay?.scope   ?? 'user',
        bytes:    f.bytes,
        updatedAt: f.updatedAt,
      }));

      return res.status(200).json({ docs });
    } catch (err) {
      console.error('[nyayFile] list-docs error:', err);
      return res.status(500).json({ error: err.message || 'Unexpected error.' });
    }
  });

  return router;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Find the most recent file record matching user + filename.
 * If case_slug is provided, restrict to that case. If scope=firm is requested,
 * also look at firm-admin user's files with matching companySlug.
 */
async function _findFile(userId, filename, { case_slug, scope } = {}) {
  // Build candidate filter list
  const filters = [];

  // User-owned match
  const userFilter = { user: userId, filename };
  if (case_slug) userFilter['metadata.nyay.caseSlug'] = case_slug;
  filters.push(userFilter);

  // Firm-scoped match (files owned by the firm admin but queryable by company_slug)
  if (scope === 'firm' || scope === undefined) {
    const firmAdminId = process.env.NYAY_FIRM_ADMIN_USER_ID;
    if (firmAdminId && firmAdminId !== userId) {
      const user = await getUserById(userId, 'company_slug').catch(() => null);
      if (user?.company_slug) {
        const firmFilter = {
          user: firmAdminId,
          filename,
          'metadata.nyay.scope': 'firm',
          'metadata.nyay.companySlug': user.company_slug,
        };
        if (case_slug) firmFilter['metadata.nyay.caseSlug'] = case_slug;
        filters.push(firmFilter);
      }
    }
  }

  // Try each filter; return first hit (user-owned takes priority)
  for (const f of filters) {
    const files = await getFiles(f, { updatedAt: -1 }, {
      file_id: 1, filepath: 1, source: 1, filename: 1, metadata: 1,
    });
    if (files?.length) return files[0];
  }
  return null;
}

/**
 * Build the MongoDB filter for listing all docs in a case folder.
 */
async function _buildCaseFilter(userId, caseSlug, scope) {
  const orClauses = [
    { user: userId, 'metadata.nyay.caseSlug': caseSlug },
  ];

  if (scope === 'firm' || scope === undefined) {
    const firmAdminId = process.env.NYAY_FIRM_ADMIN_USER_ID;
    if (firmAdminId && firmAdminId !== userId) {
      const user = await getUserById(userId, 'company_slug').catch(() => null);
      if (user?.company_slug) {
        orClauses.push({
          user:                       firmAdminId,
          'metadata.nyay.caseSlug':   caseSlug,
          'metadata.nyay.scope':      'firm',
          'metadata.nyay.companySlug': user.company_slug,
        });
      }
    }
  }

  return { $or: orClauses };
}

/**
 * Stream the file content from S3 / local storage and return as a UTF-8 string.
 */
async function _readFileContent(appConfig, userId, fileRecord) {
  const mockReq = { config: appConfig, user: { id: userId } };
  const { getDownloadStream } = getStrategyFunctions(fileRecord.source);
  const stream = await getDownloadStream(mockReq, fileRecord.filepath);
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}
