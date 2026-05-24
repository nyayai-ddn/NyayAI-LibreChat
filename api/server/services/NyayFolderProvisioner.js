/**
 * api/server/services/NyayFolderProvisioner.js
 *
 * Lazily provisions the NyayAI/Litigation folder tree in MongoDB on first write
 * per user. All functions are idempotent and safe to call concurrently.
 *
 * Full folder hierarchy (depths):
 *   NyayAI/                          depth=0
 *     Litigation/                    depth=1
 *       Practice Profile/            depth=2  ← CLAUDE.md
 *       _Portfolio/                  depth=2  ← case registry
 *       Cases/                       depth=2
 *         [case-slug]/               depth=3  ← all docs for one case
 *       Demand Letters/              depth=2
 *         [demand-slug]/             depth=3
 *       Inbound/                     depth=2
 *         [inbound-slug]/            depth=3
 *       OC Status/                   depth=2
 *         [YYYY-MM-DD]/              depth=3
 */

const FileFolder = require('~/models/FileFolder');

const ROOT_FOLDER        = 'NyayAI';
const LITIGATION_FOLDER  = 'Litigation';
const VERNACULAR_FOLDER  = 'Vernacular';

// ── Depth-2 leaf provisioners ──────────────────────────────────────────────────

/**
 * Ensures NyayAI/Litigation/{leafFolderName} exists (depth 2).
 * @returns {Promise<string>} leaf folder _id
 */
async function ensureNyayLitigationFolder(userId, leafFolderName) {
  const litId = await _litigationId(userId);
  const leaf  = await _findOrCreate(userId, leafFolderName, litId, 2);
  return leaf._id.toString();
}

/**
 * Ensures NyayAI/Litigation/_Portfolio exists (depth 2).
 * @returns {Promise<string>} _Portfolio folder _id
 */
async function ensureNyayPortfolioFolder(userId) {
  return ensureNyayLitigationFolder(userId, '_Portfolio');
}

// ── Depth-3 per-entity provisioners ───────────────────────────────────────────

/**
 * Ensures NyayAI/Litigation/Cases/{caseSlug} exists (depth 3).
 * @returns {Promise<string>} case sub-folder _id
 */
async function ensureNyayCaseFolder(userId, caseSlug) {
  const casesFolderId = await ensureNyayLitigationFolder(userId, 'Cases');
  const folder        = await _findOrCreate(userId, caseSlug, casesFolderId, 3);
  return folder._id.toString();
}

/**
 * Ensures NyayAI/Litigation/Demand Letters/{demandSlug} exists (depth 3).
 * @returns {Promise<string>} demand sub-folder _id
 */
async function ensureNyayDemandFolder(userId, demandSlug) {
  const parentId = await ensureNyayLitigationFolder(userId, 'Demand Letters');
  const folder   = await _findOrCreate(userId, demandSlug, parentId, 3);
  return folder._id.toString();
}

/**
 * Ensures NyayAI/Litigation/Inbound/{inboundSlug} exists (depth 3).
 * @returns {Promise<string>} inbound sub-folder _id
 */
async function ensureNyayInboundFolder(userId, inboundSlug) {
  const parentId = await ensureNyayLitigationFolder(userId, 'Inbound');
  const folder   = await _findOrCreate(userId, inboundSlug, parentId, 3);
  return folder._id.toString();
}

/**
 * Ensures NyayAI/Litigation/OC Status/{dateStr} exists (depth 3).
 * @param {string} dateStr  e.g. "2026-05-17"
 * @returns {Promise<string>} date sub-folder _id
 */
async function ensureNyayOCStatusFolder(userId, dateStr) {
  const parentId = await ensureNyayLitigationFolder(userId, 'OC Status');
  const folder   = await _findOrCreate(userId, dateStr, parentId, 3);
  return folder._id.toString();
}

/**
 * Returns the depth-0 NyayAI folder _id (creates if absent).
 * Used by visibility queries.
 */
async function getNyayRootFolderId(userId) {
  const root = await _findOrCreate(userId, ROOT_FOLDER, null, 0);
  return root._id.toString();
}

/**
 * Ensures NyayAI/Vernacular exists (depth 1) and returns its _id.
 * Used by the OCR service to store extracted, translated, and summary files.
 */
async function ensureNyayVernacularFolder(userId) {
  const root = await _findOrCreate(userId, ROOT_FOLDER, null, 0);
  const folder = await _findOrCreate(userId, VERNACULAR_FOLDER, root._id.toString(), 1);
  return folder._id.toString();
}

// ── Resolve folder _id from a folder_type + optional slug ─────────────────────

/**
 * Resolve the correct FM folder _id for a given folder_type and optional slug.
 *
 * folder_type values:
 *   "practice-profile"  → NyayAI/Litigation/Practice Profile/
 *   "portfolio"         → NyayAI/Litigation/_Portfolio/
 *   "case"              → NyayAI/Litigation/Cases/{slug}/
 *   "demand"            → NyayAI/Litigation/Demand Letters/{slug}/
 *   "inbound"           → NyayAI/Litigation/Inbound/{slug}/
 *   "oc-status"         → NyayAI/Litigation/OC Status/{slug}/
 *
 * @param {string} userId
 * @param {string} folderType
 * @param {string} [slug]  required for case / demand / inbound / oc-status
 * @returns {Promise<string>} folder _id
 */
async function resolveFolderForType(userId, folderType, slug) {
  switch (folderType) {
    case 'practice-profile':
      return ensureNyayLitigationFolder(userId, 'Practice Profile');
    case 'portfolio':
      return ensureNyayPortfolioFolder(userId);
    case 'case':
      if (!slug) throw new Error('slug required for folder_type=case');
      return ensureNyayCaseFolder(userId, slug);
    case 'demand':
      if (!slug) throw new Error('slug required for folder_type=demand');
      return ensureNyayDemandFolder(userId, slug);
    case 'inbound':
      if (!slug) throw new Error('slug required for folder_type=inbound');
      return ensureNyayInboundFolder(userId, slug);
    case 'oc-status':
      if (!slug) throw new Error('slug required for folder_type=oc-status');
      return ensureNyayOCStatusFolder(userId, slug);
    case 'vernacular':
      return ensureNyayVernacularFolder(userId);
    default:
      // Fallback: treat as a depth-2 leaf folder name
      return ensureNyayLitigationFolder(userId, folderType);
  }
}

// ── Private helpers ────────────────────────────────────────────────────────────

async function _litigationId(userId) {
  const root = await _findOrCreate(userId, ROOT_FOLDER, null, 0);
  const lit  = await _findOrCreate(userId, LITIGATION_FOLDER, root._id.toString(), 1);
  return lit._id.toString();
}

async function _findOrCreate(userId, name, parentId, depth) {
  const normalizedName = name.trim().toLowerCase();

  let folder = await FileFolder.findOne({
    user:           userId,
    parentId:       parentId,
    normalizedName: normalizedName,
  }).lean();

  if (folder) return folder;

  try {
    folder = await FileFolder.create({
      user:           userId,
      name:           name.trim(),
      normalizedName: normalizedName,
      parentId:       parentId,
      depth:          depth,
    });
    return folder;
  } catch (err) {
    if (err.code === 11000) {
      folder = await FileFolder.findOne({
        user:           userId,
        parentId:       parentId,
        normalizedName: normalizedName,
      }).lean();
      if (folder) return folder;
    }
    throw err;
  }
}

module.exports = {
  ensureNyayLitigationFolder,
  ensureNyayPortfolioFolder,
  ensureNyayCaseFolder,
  ensureNyayDemandFolder,
  ensureNyayInboundFolder,
  ensureNyayOCStatusFolder,
  ensureNyayVernacularFolder,
  resolveFolderForType,
  getNyayRootFolderId,
};
