/**
 * api/server/services/NyayFolderProvisioner.js
 *
 * Lazily provisions the NyayAI/Litigation/{leaf} folder tree in MongoDB
 * on first write for each user.
 *
 * Resulting structure:
 *   NyayAI/                      depth=0  parentId=null
 *     Litigation/                depth=1  parentId=<NyayAI._id>
 *       Practice Profile/        depth=2  parentId=<Litigation._id>
 *       Cases/                   depth=2  parentId=<Litigation._id>
 */

const FileFolder = require('~/models/FileFolder');

const ROOT_FOLDER       = 'NyayAI';
const LITIGATION_FOLDER = 'Litigation';

/**
 * Ensures the full NyayAI/Litigation/{leafFolderName} path exists for the user.
 * Creates any missing folders; safe to call concurrently (upsert pattern).
 *
 * @param {string} userId        MongoDB ObjectId string of the user.
 * @param {string} leafFolderName  e.g. "Practice Profile" | "Cases"
 * @returns {Promise<string>}    MongoDB _id string of the leaf folder.
 */
async function ensureNyayLitigationFolder(userId, leafFolderName) {
  const root      = await _findOrCreate(userId, ROOT_FOLDER,       null,                     0);
  const rootId    = root._id.toString();
  const lit       = await _findOrCreate(userId, LITIGATION_FOLDER, rootId,                   1);
  const litId     = lit._id.toString();
  const leaf      = await _findOrCreate(userId, leafFolderName,    litId,                    2);
  return leaf._id.toString();
}

/**
 * Returns just the depth-0 NyayAI folder _id for the user (creates if absent).
 * Used by visibility queries.
 */
async function getNyayRootFolderId(userId) {
  const root = await _findOrCreate(userId, ROOT_FOLDER, null, 0);
  return root._id.toString();
}

// ── private ────────────────────────────────────────────────────────────────────

async function _findOrCreate(userId, name, parentId, depth) {
  const normalizedName = name.trim().toLowerCase();

  // Try read first (common hot path).
  let folder = await FileFolder.findOne({
    user:           userId,
    parentId:       parentId,
    normalizedName: normalizedName,
  }).lean();

  if (folder) {
    return folder;
  }

  // Not found — create, but tolerate duplicate-key errors from concurrent requests.
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
      // Race: another request created it first — re-fetch.
      folder = await FileFolder.findOne({
        user:           userId,
        parentId:       parentId,
        normalizedName: normalizedName,
      }).lean();
      if (folder) {
        return folder;
      }
    }
    throw err;
  }
}

module.exports = { ensureNyayLitigationFolder, getNyayRootFolderId };
