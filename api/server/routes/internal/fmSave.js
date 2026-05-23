/**
 * api/server/routes/internal/fmSave.js
 *
 * Internal service-to-service route called by the NyayAI Litigation Backend
 * to save generated files into the LibreChat File Manager (MongoDB + S3/local).
 *
 * Protected by NYAY_SERVICE_KEY env var — never expose to the public internet.
 *
 * POST /api/internal/fm-save
 * Headers: x-nyay-service-key: <NYAY_SERVICE_KEY>
 * Body:
 *   user_id      string   required — LibreChat MongoDB user _id (author)
 *   filename     string   required — e.g. "case.md"
 *   content      string   required — UTF-8 text content
 *   folder_type  string   optional — "practice-profile" | "portfolio" | "case" |
 *                                    "demand" | "inbound" | "oc-status" | "vernacular"
 *                                    Defaults to legacy "folder_name" field.
 *   folder_name  string   optional — legacy: leaf folder name at depth 2
 *   slug         string   optional — required for folder_type case/demand/inbound/oc-status
 *   scope        string   optional — "user" (default) | "firm"
 *   doc_type     string   optional — e.g. "case-profile", "case-history", "notice-draft"
 *   version      number   optional — for versioned docs (element-chart-v2, etc.)
 *   mime_type    string   optional — defaults to "text/markdown"
 *
 * Returns: { file_id, folder_id, filepath }
 */

const fs   = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const express = require('express');
const { FileSources, FileContext } = require('librechat-data-provider');
const { createFile }    = require('~/models/File');
const { getUserById }   = require('~/models');
const { getStrategyFunctions } = require('~/server/services/Files/strategies');
const {
  ensureNyayLitigationFolder,
  resolveFolderForType,
} = require('~/server/services/NyayFolderProvisioner');

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
 * Resolve the target folder _id from request body.
 * Supports both the new folder_type/slug API and the legacy folder_name API.
 */
async function _resolveFolderId(userId, body) {
  const { folder_type, slug, folder_name } = body;
  if (folder_type) {
    return resolveFolderForType(userId, folder_type, slug);
  }
  // Legacy: folder_name = depth-2 leaf name (e.g. "Practice Profile", "Cases")
  return ensureNyayLitigationFolder(userId, folder_name || 'Practice Profile');
}

/**
 * Look up the folder that contains a given file and return its _id.
 * Used to place generated files in the same folder as the source PDF.
 */
async function _folderIdFromParent(parentFileId) {
  try {
    const { File } = require('~/db/models');
    const parent = await File.findOne({ file_id: parentFileId }, { 'metadata.fileManager.folderId': 1 }).lean();
    return parent?.metadata?.fileManager?.folderId ?? null;
  } catch {
    return null;
  }
}

/**
 * Factory: returns the Express router, wired to the active file storage strategy.
 */
module.exports = function createFmSaveRouter(appConfig) {
  const router = express.Router();

  router.post('/fm-save', requireServiceKey, async (req, res) => {
    try {
      const {
        user_id,
        filename,
        content,
        scope     = 'user',
        doc_type,
        version,
        mime_type = 'text/markdown',
        slug,
      } = req.body;

      if (!user_id || !filename || !content) {
        return res.status(400).json({ error: 'user_id, filename, and content are required.' });
      }

      // For firm-scoped writes, use the firm admin user_id as the owner so all
      // firm members can query it. Fall back to the requesting user if not configured.
      const firmAdminId = process.env.NYAY_FIRM_ADMIN_USER_ID;
      const ownerId     = (scope === 'firm' && firmAdminId) ? firmAdminId : user_id;

      // ── Provision the correct folder ─────────────────────────────────────────
      // If parent_file_id is supplied, place generated file in the same folder
      // as the source file (including Unfiled — folderId = null is intentional).
      // Only fall back to _resolveFolderId when no parent is given at all.
      const { parent_file_id } = req.body;
      let folderId;
      if (parent_file_id) {
        folderId = await _folderIdFromParent(parent_file_id); // null = Unfiled, that's fine
      } else {
        folderId = await _resolveFolderId(ownerId, req.body);
      }

      // ── Save file using the configured storage strategy ───────────────────────
      const fileSource    = appConfig?.fileStrategy ?? FileSources.local;
      const buffer        = Buffer.from(content, 'utf8');
      const fileUuid      = uuidv4();
      const storedFilename = `${fileUuid}__${filename}`;

      let filepath;
      if (fileSource === FileSources.local) {
        const uploadsRoot = appConfig?.paths?.uploads || path.join(process.cwd(), 'uploads');
        const userDir     = path.join(uploadsRoot, ownerId.toString());
        fs.mkdirSync(userDir, { recursive: true });
        fs.writeFileSync(path.join(userDir, storedFilename), buffer);
        filepath = `/uploads/${ownerId}/${storedFilename}`;
      } else {
        const { saveBuffer } = getStrategyFunctions(fileSource);
        const owner = await getUserById(ownerId, 'username company_slug');
        filepath = await saveBuffer({
          userId:      ownerId,
          username:    owner?.username,
          companySlug: owner?.company_slug,
          buffer,
          fileName:    storedFilename,
          basePath:    'uploads',
        });
      }

      // ── Build nyay metadata ───────────────────────────────────────────────────
      const nyayMeta = { scope };
      if (doc_type)       nyayMeta.docType      = doc_type;
      if (slug)           nyayMeta.caseSlug     = slug;
      if (version != null) nyayMeta.version     = version;
      if (parent_file_id) nyayMeta.parentFileId = parent_file_id;

      // Denormalise companySlug for firm-wide queries without a JOIN.
      if (scope === 'firm') {
        const author = await getUserById(user_id, 'company_slug');
        if (author?.company_slug) nyayMeta.companySlug = author.company_slug;
      }

      // ── Create (or upsert) the File record ────────────────────────────────────
      await createFile(
        {
          file_id:  fileUuid,
          user:     ownerId,
          filename: filename,
          filepath: filepath,
          source:   fileSource,
          type:     mime_type,
          bytes:    buffer.byteLength,
          context:  FileContext.message_attachment,
          metadata: {
            fileManager: { folderId },
            nyay:        nyayMeta,
          },
        },
        true, // disableTTL
      );

      return res.status(201).json({ file_id: fileUuid, folder_id: folderId, filepath });
    } catch (err) {
      console.error('[fmSave] error:', err);
      return res.status(500).json({ error: err.message || 'Unexpected error.' });
    }
  });

  return router;
};
