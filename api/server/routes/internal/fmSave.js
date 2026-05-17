/**
 * api/server/routes/internal/fmSave.js
 *
 * Internal service-to-service route called by the NyayAI Litigation Backend
 * to save generated files (CLAUDE.md, case.md) into the LibreChat File Manager.
 *
 * Protected by NYAY_SERVICE_KEY env var — never expose to the public internet.
 * Export: factory function — call require('./routes/internal/fmSave')(appConfig)
 *
 * POST /api/internal/fm-save
 * Headers: x-nyay-service-key: <NYAY_SERVICE_KEY>
 * Body: { user_id, folder_name, filename, content, mime_type? }
 * Returns: { file_id, folder_id, filepath }
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const express = require('express');
const { FileSources, FileContext } = require('librechat-data-provider');
const { createFile } = require('~/models/File');
const { getUserById } = require('~/models');
const { getStrategyFunctions } = require('~/server/services/Files/strategies');
const { ensureNyayLitigationFolder } = require('~/server/services/NyayFolderProvisioner');

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
module.exports = function createFmSaveRouter(appConfig) {
  const router = express.Router();

  // ── POST /api/internal/fm-save ──────────────────────────────────────────────
  router.post('/fm-save', requireServiceKey, async (req, res) => {
    try {
      const {
        user_id,
        folder_name = 'Practice Setup',
        filename,
        content,
        mime_type = 'text/markdown',
      } = req.body;

      if (!user_id || !filename || !content) {
        return res.status(400).json({ error: 'user_id, filename, and content are required.' });
      }

      // ── 1. Provision NyayAI/Litigation/{folder_name} folder tree ────────────
      const folderId = await ensureNyayLitigationFolder(user_id, folder_name);

      // ── 2. Save file using the configured storage strategy ───────────────────
      const fileSource = appConfig?.fileStrategy ?? FileSources.local;

      const buffer = Buffer.from(content, 'utf8');
      const fileUuid = uuidv4();
      const storedFilename = `${fileUuid}__${filename}`;

      let filepath;
      if (fileSource === FileSources.local) {
        // Local strategy: write directly to uploads_root/{userId}/{file}.
        // saveLocalBuffer('uploads') nests an extra directory level which breaks
        // getLocalFileStream's path resolution — so we write directly here.
        const uploadsRoot = appConfig?.paths?.uploads || path.join(process.cwd(), 'uploads');
        const userDir = path.join(uploadsRoot, user_id.toString());
        fs.mkdirSync(userDir, { recursive: true });
        fs.writeFileSync(path.join(userDir, storedFilename), buffer);
        filepath = `/uploads/${user_id}/${storedFilename}`;
      } else {
        // Cloud strategy (S3, Firebase, Azure): use the strategy's saveBuffer.
        // These strategies need user context for bucket/path resolution.
        const { saveBuffer } = getStrategyFunctions(fileSource);
        const user = await getUserById(user_id, 'username company_slug');
        filepath = await saveBuffer({
          userId:      user_id,
          username:    user?.username,
          companySlug: user?.company_slug,
          buffer,
          fileName:    storedFilename,
          basePath:    'uploads',
        });
      }

      // ── 3. Create (or upsert) the File record ────────────────────────────────
      await createFile(
        {
          file_id:  fileUuid,
          user:     user_id,
          filename: filename,
          filepath: filepath,
          source:   fileSource,
          type:     mime_type,
          bytes:    buffer.byteLength,
          context:  FileContext.message_attachment,
          metadata: {
            fileManager: { folderId: folderId },
          },
        },
        true, // disableTTL — file should persist
      );

      return res.status(201).json({ file_id: fileUuid, folder_id: folderId, filepath });
    } catch (err) {
      console.error('[fmSave] error:', err);
      return res.status(500).json({ error: err.message || 'Unexpected error.' });
    }
  });

  return router;
};
