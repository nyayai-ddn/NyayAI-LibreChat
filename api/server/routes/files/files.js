const path = require('path');
const fs = require('fs').promises;
const express = require('express');
const { sanitizeFilename } = require('@librechat/api');
const { EnvVar } = require('@librechat/agents');
const { logger } = require('@librechat/data-schemas');
const {
  Time,
  isUUID,
  CacheKeys,
  FileSources,
  FileContext,
  ResourceType,
  EModelEndpoint,
  PermissionBits,
  checkOpenAIStorage,
  isAssistantsEndpoint,
} = require('librechat-data-provider');
const {
  filterFile,
  processFileUpload,
  processDeleteRequest,
  processAgentFileUpload,
} = require('~/server/services/Files/process');
const { fileAccess } = require('~/server/middleware/accessResources/fileAccess');
const { getStrategyFunctions } = require('~/server/services/Files/strategies');
const { getOpenAIClient } = require('~/server/controllers/assistants/helpers');
const { checkPermission } = require('~/server/services/PermissionService');
const { loadAuthValues } = require('~/server/services/Tools/credentials');
const { refreshS3FileUrls } = require('~/server/services/Files/S3/crud');
const { hasAccessToFilesViaAgent } = require('~/server/services/Files');
const { getFiles, batchUpdateFiles, createFile } = require('~/models/File');
const { cleanFileName } = require('~/server/utils/files');
const { getAssistant } = require('~/models/Assistant');
const { getAgent } = require('~/models/Agent');
const { getLogStores } = require('~/cache');
const FileFolder = require('~/models/FileFolder');
const { File } = require('~/db/models');
const { Readable } = require('stream');

const router = express.Router();

const FILE_MANAGER_METADATA_PATH = 'metadata.fileManager';
const FILE_MANAGER_FOLDER_PATH = `${FILE_MANAGER_METADATA_PATH}.folderId`;
const FILE_MANAGER_ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.csv',
  '.txt',
  '.png',
  '.jpg',
  '.jpeg',
]);

const normalizeFolderName = (name = '') => name.trim().replace(/\s+/g, ' ').toLowerCase();

const mapManagedFile = (file, folderName = null) => ({
  id: file.file_id,
  file_id: file.file_id,
  filename: file.filename,
  type: file.type,
  size: file.bytes ?? 0,
  status: 'active',
  folder_id: file?.metadata?.fileManager?.folderId ?? null,
  folder_name: folderName,
  filepath: file.filepath,
  source: file.source,
  metadata: file.metadata,
  height: file.height,
  width: file.width,
  created_at: file.createdAt,
  updated_at: file.updatedAt,
});

const buildFolderTree = (folders, counts) => {
  const nodes = new Map();
  const roots = [];

  for (const folder of folders) {
    const id = folder._id.toString();
    nodes.set(id, {
      id,
      name: folder.name,
      parent_id: folder.parentId,
      created_at: folder.createdAt,
      children: [],
      file_count: counts.get(id) ?? 0,
    });
  }

  for (const folder of folders) {
    const id = folder._id.toString();
    const node = nodes.get(id);
    if (folder.parentId && nodes.has(folder.parentId)) {
      nodes.get(folder.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (items) => {
    items.sort((a, b) => a.name.localeCompare(b.name));
    items.forEach((item) => sortNodes(item.children));
  };

  sortNodes(roots);

  roots.push({
    id: null,
    name: 'Unfiled',
    parent_id: null,
    created_at: null,
    children: [],
    file_count: counts.get(null) ?? 0,
    virtual: true,
  });

  return roots;
};

const getManagedFileFilter = (userId, folderId, queryText, scopedFolderIds) => {
  const filter = {
    user: reqUserIdToObject(userId),
    context: FileContext.message_attachment,
  };

  if (folderId === 'root') {
    filter[FILE_MANAGER_FOLDER_PATH] = '__root__';
  } else if (folderId === 'unfiled') {
    filter.$or = [
      { [FILE_MANAGER_FOLDER_PATH]: null },
      { [FILE_MANAGER_FOLDER_PATH]: { $exists: false } },
    ];
  } else if (Array.isArray(scopedFolderIds) && scopedFolderIds.length > 0) {
    filter[FILE_MANAGER_FOLDER_PATH] = { $in: scopedFolderIds };
  } else if (folderId) {
    filter[FILE_MANAGER_FOLDER_PATH] = folderId;
  }

  if (queryText) {
    filter.filename = { $regex: queryText, $options: 'i' };
  }

  return filter;
};

const collectDescendantFolderIds = (folders, rootFolderId) => {
  if (!rootFolderId) {
    return [];
  }

  const childMap = new Map();
  for (const folder of folders) {
    const parentId = folder.parentId ?? null;
    const currentFolderId = folder._id.toString();
    if (!childMap.has(parentId)) {
      childMap.set(parentId, []);
    }
    childMap.get(parentId).push(currentFolderId);
  }

  const visited = new Set();
  const stack = [rootFolderId];

  while (stack.length > 0) {
    const currentId = stack.pop();
    if (!currentId || visited.has(currentId)) {
      continue;
    }

    visited.add(currentId);
    const childIds = childMap.get(currentId) ?? [];
    childIds.forEach((childId) => stack.push(childId));
  }

  return Array.from(visited);
};
function reqUserIdToObject(userId) {
  return userId;
}

async function assertFolderOwnership(userId, folderId) {
  const folder = await FileFolder.findOne({ _id: folderId, user: userId }).lean();
  if (!folder) {
    const error = new Error('Folder not found');
    error.statusCode = 404;
    throw error;
  }
  return folder;
}

async function getFolderCounts(userId) {
  const rows = await File.aggregate([
    {
      $match: {
        user: reqUserIdToObject(userId),
        context: FileContext.message_attachment,
      },
    },
    {
      $group: {
        _id: `$${FILE_MANAGER_FOLDER_PATH}`,
        count: { $sum: 1 },
      },
    },
  ]);

  return new Map(rows.map((row) => [row._id ?? null, row.count]));
}

async function validateFolderDepth(userId, parentId) {
  if (!parentId) {
    return 0;
  }

  const parent = await assertFolderOwnership(userId, parentId);
  const depth = (parent.depth ?? 0) + 1;
  if (depth > 9) {
    const error = new Error('Maximum folder depth reached');
    error.statusCode = 422;
    throw error;
  }

  return depth;
}

async function uploadManagedFile(req) {
  if (!req.file) {
    const error = new Error('No file provided');
    error.statusCode = 400;
    throw error;
  }

  const originalName = decodeURIComponent(req.file.originalname || '');
  const sanitizedName = sanitizeFilename(originalName);
  const extension = path.extname(sanitizedName).toLowerCase();

  if (
    !sanitizedName ||
    sanitizedName !== path.basename(sanitizedName) ||
    sanitizedName.includes('..') ||
    !FILE_MANAGER_ALLOWED_EXTENSIONS.has(extension)
  ) {
    const error = new Error('File type or name is not allowed');
    error.statusCode = 422;
    throw error;
  }

  const folderId = req.body?.folder_id || req.query?.folder_id || null;
  if (folderId) {
    await assertFolderOwnership(req.user.id, folderId);
  }

  const source = req.config.fileStrategy ?? FileSources.local;
  const { handleFileUpload } = getStrategyFunctions(source);

  if (!handleFileUpload) {
    const error = new Error(`Upload is not available for ${source}`);
    error.statusCode = 501;
    throw error;
  }

  const uploadResult = await handleFileUpload({
    req,
    file: {
      ...req.file,
      originalname: sanitizedName,
    },
    file_id: req.file_id,
    basePath: req.file.mimetype.startsWith('image/') ? 'images' : 'uploads',
  });

  return createFile(
    {
      user: req.user.id,
      file_id: req.file_id,
      bytes: uploadResult.bytes,
      filepath: uploadResult.filepath,
      filename: uploadResult.filename ?? sanitizedName,
      context: FileContext.message_attachment,
      type: req.file.mimetype,
      embedded: uploadResult.embedded,
      source,
      height: uploadResult.height,
      width: uploadResult.width,
      metadata: {
        fileManager: {
          folderId,
        },
      },
    },
    true,
  );
}

router.get('/folders', async (req, res) => {
  try {
    const folders = await FileFolder.find({ user: req.user.id }).sort({ name: 1 }).lean();
    const counts = await getFolderCounts(req.user.id);
    res.status(200).json(buildFolderTree(folders, counts));
  } catch (error) {
    logger.error('[/files/folders] Error getting folders:', error);
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || 'Failed to load folders' });
  }
});

router.post('/folders', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const parentId = req.body?.parent_id || null;

    if (!name) {
      return res.status(400).json({ message: 'Folder name is required' });
    }

    const normalizedName = normalizeFolderName(name);
    const depth = await validateFolderDepth(req.user.id, parentId);

    const existing = await FileFolder.findOne({
      user: req.user.id,
      parentId,
      normalizedName,
    }).lean();

    if (existing) {
      return res.status(409).json({ message: 'A folder with this name already exists' });
    }

    const folder = await FileFolder.create({
      user: req.user.id,
      name,
      normalizedName,
      parentId,
      depth,
    });

    res.status(201).json({
      id: folder._id.toString(),
      name: folder.name,
      parent_id: folder.parentId,
      created_at: folder.createdAt,
      children: [],
      file_count: 0,
    });
  } catch (error) {
    logger.error('[/files/folders] Error creating folder:', error);
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || 'Failed to create folder' });
  }
});

router.delete('/folders/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    const folder = await assertFolderOwnership(req.user.id, folderId);
    const childCount = await FileFolder.countDocuments({ user: req.user.id, parentId: folderId });

    if (childCount > 0) {
      return res.status(409).json({ message: 'Delete child folders first' });
    }

    const updateResult = await File.updateMany(
      {
        user: req.user.id,
        context: FileContext.message_attachment,
        [FILE_MANAGER_FOLDER_PATH]: folderId,
      },
      {
        $set: {
          [FILE_MANAGER_FOLDER_PATH]: null,
        },
      },
    );

    await FileFolder.deleteOne({ _id: folder._id, user: req.user.id });

    res.status(200).json({ deleted: true, orphaned_files: updateResult.modifiedCount ?? 0 });
  } catch (error) {
    logger.error('[/files/folders/:folderId] Error deleting folder:', error);
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || 'Failed to delete folder' });
  }
});

router.get('/manager', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const folderId = typeof req.query.folder_id === 'string' ? req.query.folder_id : undefined;
    const queryText = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const sort = typeof req.query.sort === 'string' ? req.query.sort : 'created_at_desc';
    const includeDescendants = req.query.include_descendants === 'true';
    const skip = (page - 1) * limit;
    const sortMap = {
      created_at_desc: { createdAt: -1 },
      created_at_asc: { createdAt: 1 },
      filename_asc: { filename: 1 },
      filename_desc: { filename: -1 },
      size_asc: { bytes: 1 },
      size_desc: { bytes: -1 },
    };

    const folders = await FileFolder.find({ user: req.user.id }).lean();
    const scopedFolderIds =
      folderId && folderId !== 'root' && folderId !== 'unfiled' && includeDescendants
        ? collectDescendantFolderIds(folders, folderId)
        : undefined;
    const filter = getManagedFileFilter(req.user.id, folderId, queryText, scopedFolderIds);
    const [files, totalCount] = await Promise.all([
      File.find(filter)
        .sort(sortMap[sort] || sortMap.created_at_desc)
        .skip(skip)
        .limit(limit)
        .lean(),
      File.countDocuments(filter),
    ]);

    const folderNameMap = new Map(folders.map((folder) => [folder._id.toString(), folder.name]));

    res.status(200).json({
      files: files.map((file) =>
        mapManagedFile(file, folderNameMap.get(file?.metadata?.fileManager?.folderId) ?? null),
      ),
      total_count: totalCount,
      next_cursor: page * limit < totalCount ? String(page + 1) : null,
      prev_cursor: page > 1 ? String(page - 1) : null,
    });
  } catch (error) {
    logger.error('[/files/manager] Error listing managed files:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Failed to load files' });
  }
});

router.post('/manager/upload', async (req, res) => {
  try {
    const file = await uploadManagedFile(req);
    res.status(201).json(mapManagedFile(file));
  } catch (error) {
    logger.error('[/files/manager/upload] Error uploading managed file:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Upload failed' });
  }
});

router.patch('/manager/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const folderId = req.body?.folder_id || null;

    if (folderId) {
      await assertFolderOwnership(req.user.id, folderId);
    }

    const file = await File.findOneAndUpdate(
      {
        file_id: fileId,
        user: req.user.id,
        context: FileContext.message_attachment,
      },
      {
        $set: {
          [FILE_MANAGER_FOLDER_PATH]: folderId,
        },
      },
      { new: true },
    ).lean();

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    const folderName = folderId
      ? ((await FileFolder.findOne({ _id: folderId, user: req.user.id }).lean())?.name ?? null)
      : null;

    res.status(200).json(mapManagedFile(file, folderName));
  } catch (error) {
    logger.error('[/files/manager/:fileId] Error moving managed file:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Failed to move file' });
  }
});

router.delete('/manager/:fileId', async (req, res) => {
  try {
    const file = await File.findOne({
      file_id: req.params.fileId,
      user: req.user.id,
      context: FileContext.message_attachment,
    }).lean();

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    await processDeleteRequest({ req, files: [file] });
    res.status(200).json({ deleted: true });
  } catch (error) {
    logger.error('[/files/manager/:fileId] Error deleting managed file:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Failed to delete file' });
  }
});

router.post('/manager/bulk-delete', async (req, res) => {
  try {
    const fileIds = Array.isArray(req.body?.file_ids) ? req.body.file_ids : [];
    if (fileIds.length === 0) {
      return res.status(200).json({ deleted_count: 0, skipped_count: 0 });
    }

    const files = await File.find({
      file_id: { $in: fileIds },
      user: req.user.id,
      context: FileContext.message_attachment,
    }).lean();

    await processDeleteRequest({ req, files });

    res.status(200).json({
      deleted_count: files.length,
      skipped_count: Math.max(0, fileIds.length - files.length),
    });
  } catch (error) {
    logger.error('[/files/manager/bulk-delete] Error deleting managed files:', error);
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || 'Failed to delete files' });
  }
});

router.get('/manager/:fileId/download-url', async (req, res) => {
  try {
    const file = await File.findOne({
      file_id: req.params.fileId,
      user: req.user.id,
      context: FileContext.message_attachment,
    }).lean();

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    res.status(200).json({
      url: `/api/files/download/${req.user.id}/${file.file_id}`,
      expires_in: 0,
      filename: file.filename,
      mime_type: file.type,
    });
  } catch (error) {
    logger.error('[/files/manager/:fileId/download-url] Error generating managed file url:', error);
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || 'Failed to get file url' });
  }
});

router.get('/manager/:fileId/content', async (req, res) => {
  try {
    const file = await File.findOne({
      file_id: req.params.fileId,
      user: req.user.id,
      context: FileContext.message_attachment,
    }).lean();

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    const { getDownloadStream } = getStrategyFunctions(file.source);
    if (!getDownloadStream) {
      return res.status(501).json({ message: 'Download not supported for this file source' });
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    const stream = await getDownloadStream(req, file.filepath);
    stream.pipe(res);
  } catch (error) {
    logger.error('[/files/manager/:fileId/content] Error:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Failed to get file content' });
  }
});

router.get('/', async (req, res) => {
  try {
    const appConfig = req.config;
    const files = await getFiles({ user: req.user.id });
    if (appConfig.fileStrategy === FileSources.s3) {
      try {
        const cache = getLogStores(CacheKeys.S3_EXPIRY_INTERVAL);
        const alreadyChecked = await cache.get(req.user.id);
        if (!alreadyChecked) {
          await refreshS3FileUrls(files, batchUpdateFiles);
          await cache.set(req.user.id, true, Time.THIRTY_MINUTES);
        }
      } catch (error) {
        logger.warn('[/files] Error refreshing S3 file URLs:', error);
      }
    }
    res.status(200).send(files);
  } catch (error) {
    logger.error('[/files] Error getting files:', error);
    res.status(400).json({ message: 'Error in request', error: error.message });
  }
});

/**
 * Get files specific to an agent
 * @route GET /files/agent/:agent_id
 * @param {string} agent_id - The agent ID to get files for
 * @returns {Promise<TFile[]>} Array of files attached to the agent
 */
router.get('/agent/:agent_id', async (req, res) => {
  try {
    const { agent_id } = req.params;
    const userId = req.user.id;

    if (!agent_id) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }

    const agent = await getAgent({ id: agent_id });
    if (!agent) {
      return res.status(200).json([]);
    }

    if (agent.author.toString() !== userId) {
      const hasEditPermission = await checkPermission({
        userId,
        role: req.user.role,
        resourceType: ResourceType.AGENT,
        resourceId: agent._id,
        requiredPermission: PermissionBits.EDIT,
      });

      if (!hasEditPermission) {
        return res.status(200).json([]);
      }
    }

    const agentFileIds = [];
    if (agent.tool_resources) {
      for (const [, resource] of Object.entries(agent.tool_resources)) {
        if (resource?.file_ids && Array.isArray(resource.file_ids)) {
          agentFileIds.push(...resource.file_ids);
        }
      }
    }

    if (agentFileIds.length === 0) {
      return res.status(200).json([]);
    }

    const files = await getFiles({ file_id: { $in: agentFileIds } }, null, { text: 0 });

    res.status(200).json(files);
  } catch (error) {
    logger.error('[/files/agent/:agent_id] Error fetching agent files:', error);
    res.status(500).json({ error: 'Failed to fetch agent files' });
  }
});

router.get('/config', async (req, res) => {
  try {
    const appConfig = req.config;
    res.status(200).json(appConfig.fileConfig);
  } catch (error) {
    logger.error('[/files] Error getting fileConfig', error);
    res.status(400).json({ message: 'Error in request', error: error.message });
  }
});

router.delete('/', async (req, res) => {
  try {
    const { files: _files } = req.body;

    /** @type {MongoFile[]} */
    const files = _files.filter((file) => {
      if (!file.file_id) {
        return false;
      }
      if (!file.filepath) {
        return false;
      }

      if (/^(file|assistant)-/.test(file.file_id)) {
        return true;
      }

      return isUUID.safeParse(file.file_id).success;
    });

    if (files.length === 0) {
      res.status(204).json({ message: 'Nothing provided to delete' });
      return;
    }

    const fileIds = files.map((file) => file.file_id);
    const dbFiles = await getFiles({ file_id: { $in: fileIds } });

    const ownedFiles = [];
    const nonOwnedFiles = [];

    for (const file of dbFiles) {
      if (file.user.toString() === req.user.id.toString()) {
        ownedFiles.push(file);
      } else {
        nonOwnedFiles.push(file);
      }
    }

    if (nonOwnedFiles.length === 0) {
      await processDeleteRequest({ req, files: ownedFiles });
      logger.debug(
        `[/files] Files deleted successfully: ${ownedFiles
          .filter((f) => f.file_id)
          .map((f) => f.file_id)
          .join(', ')}`,
      );
      res.status(200).json({ message: 'Files deleted successfully' });
      return;
    }

    let authorizedFiles = [...ownedFiles];
    let unauthorizedFiles = [];

    if (req.body.agent_id && nonOwnedFiles.length > 0) {
      const nonOwnedFileIds = nonOwnedFiles.map((f) => f.file_id);
      const accessMap = await hasAccessToFilesViaAgent({
        userId: req.user.id,
        role: req.user.role,
        fileIds: nonOwnedFileIds,
        agentId: req.body.agent_id,
        isDelete: true,
      });

      for (const file of nonOwnedFiles) {
        if (accessMap.get(file.file_id)) {
          authorizedFiles.push(file);
        } else {
          unauthorizedFiles.push(file);
        }
      }
    } else {
      unauthorizedFiles = nonOwnedFiles;
    }

    if (unauthorizedFiles.length > 0) {
      return res.status(403).json({
        message: 'You can only delete files you have access to',
        unauthorizedFiles: unauthorizedFiles.map((f) => f.file_id),
      });
    }

    /* Handle agent unlinking even if no valid files to delete */
    if (req.body.agent_id && req.body.tool_resource && dbFiles.length === 0) {
      const agent = await getAgent({
        id: req.body.agent_id,
      });

      const toolResourceFiles = agent.tool_resources?.[req.body.tool_resource]?.file_ids ?? [];
      const agentFiles = files.filter((f) => toolResourceFiles.includes(f.file_id));

      await processDeleteRequest({ req, files: agentFiles });
      res.status(200).json({ message: 'File associations removed successfully from agent' });
      return;
    }

    /* Handle assistant unlinking even if no valid files to delete */
    if (req.body.assistant_id && req.body.tool_resource && dbFiles.length === 0) {
      const assistant = await getAssistant({
        id: req.body.assistant_id,
      });

      const toolResourceFiles = assistant.tool_resources?.[req.body.tool_resource]?.file_ids ?? [];
      const assistantFiles = files.filter((f) => toolResourceFiles.includes(f.file_id));

      await processDeleteRequest({ req, files: assistantFiles });
      res.status(200).json({ message: 'File associations removed successfully from assistant' });
      return;
    } else if (
      req.body.assistant_id &&
      req.body.files?.[0]?.filepath === EModelEndpoint.azureAssistants
    ) {
      await processDeleteRequest({ req, files: req.body.files });
      return res
        .status(200)
        .json({ message: 'File associations removed successfully from Azure Assistant' });
    }

    await processDeleteRequest({ req, files: authorizedFiles });

    logger.debug(
      `[/files] Files deleted successfully: ${authorizedFiles
        .filter((f) => f.file_id)
        .map((f) => f.file_id)
        .join(', ')}`,
    );
    res.status(200).json({ message: 'Files deleted successfully' });
  } catch (error) {
    logger.error('[/files] Error deleting files:', error);
    res.status(400).json({ message: 'Error in request', error: error.message });
  }
});

function isValidID(str) {
  return /^[A-Za-z0-9_-]{21}$/.test(str);
}

router.get('/code/download/:session_id/:fileId', async (req, res) => {
  try {
    const { session_id, fileId } = req.params;
    const logPrefix = `Session ID: ${session_id} | File ID: ${fileId} | Code output download requested by user `;
    logger.debug(logPrefix);

    if (!session_id || !fileId) {
      return res.status(400).send('Bad request');
    }

    if (!isValidID(session_id) || !isValidID(fileId)) {
      logger.debug(`${logPrefix} invalid session_id or fileId`);
      return res.status(400).send('Bad request');
    }

    const { getDownloadStream } = getStrategyFunctions(FileSources.execute_code);
    if (!getDownloadStream) {
      logger.warn(
        `${logPrefix} has no stream method implemented for ${FileSources.execute_code} source`,
      );
      return res.status(501).send('Not Implemented');
    }

    const result = await loadAuthValues({ userId: req.user.id, authFields: [EnvVar.CODE_API_KEY] });

    /** @type {AxiosResponse<ReadableStream> | undefined} */
    const response = await getDownloadStream(
      `${session_id}/${fileId}`,
      result[EnvVar.CODE_API_KEY],
    );
    res.set(response.headers);
    response.data.pipe(res);
  } catch (error) {
    logger.error('Error downloading file:', error);
    res.status(500).send('Error downloading file');
  }
});

router.get('/download/:userId/:file_id', fileAccess, async (req, res) => {
  try {
    const { userId, file_id } = req.params;
    logger.debug(`File download requested by user ${userId}: ${file_id}`);

    // Access already validated by fileAccess middleware
    const file = req.fileAccess.file;

    if (checkOpenAIStorage(file.source) && !file.model) {
      logger.warn(`File download requested by user ${userId} has no associated model: ${file_id}`);
      return res.status(400).send('The model used when creating this file is not available');
    }

    const { getDownloadStream } = getStrategyFunctions(file.source);
    if (!getDownloadStream) {
      logger.warn(
        `File download requested by user ${userId} has no stream method implemented: ${file.source}`,
      );
      return res.status(501).send('Not Implemented');
    }

    const setHeaders = () => {
      const cleanedFilename = cleanFileName(file.filename);
      res.setHeader('Content-Disposition', `attachment; filename="${cleanedFilename}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('X-File-Metadata', JSON.stringify(file));
    };

    if (checkOpenAIStorage(file.source)) {
      req.body = { model: file.model };
      const endpointMap = {
        [FileSources.openai]: EModelEndpoint.assistants,
        [FileSources.azure]: EModelEndpoint.azureAssistants,
      };
      const { openai } = await getOpenAIClient({
        req,
        res,
        overrideEndpoint: endpointMap[file.source],
      });
      logger.debug(`Downloading file ${file_id} from OpenAI`);
      const passThrough = await getDownloadStream(file_id, openai);
      setHeaders();
      logger.debug(`File ${file_id} downloaded from OpenAI`);

      // Handle both Node.js and Web streams
      const stream =
        passThrough.body && typeof passThrough.body.getReader === 'function'
          ? Readable.fromWeb(passThrough.body)
          : passThrough.body;

      stream.pipe(res);
    } else {
      const fileStream = await getDownloadStream(req, file.filepath);

      fileStream.on('error', (streamError) => {
        logger.error('[DOWNLOAD ROUTE] Stream error:', streamError);
      });

      setHeaders();
      fileStream.pipe(res);
    }
  } catch (error) {
    logger.error('[DOWNLOAD ROUTE] Error downloading file:', error);
    res.status(500).send('Error downloading file');
  }
});

router.post('/', async (req, res) => {
  const metadata = req.body;
  let cleanup = true;

  try {
    filterFile({ req });

    metadata.temp_file_id = metadata.file_id;
    metadata.file_id = req.file_id;

    if (isAssistantsEndpoint(metadata.endpoint)) {
      return await processFileUpload({ req, res, metadata });
    }

    return await processAgentFileUpload({ req, res, metadata });
  } catch (error) {
    let message = 'Error processing file';
    logger.error('[/files] Error processing file:', error);

    if (error.message?.includes('file_ids')) {
      message += ': ' + error.message;
    }

    if (
      error.message?.includes('Invalid file format') ||
      error.message?.includes('No OCR result') ||
      error.message?.includes('exceeds token limit')
    ) {
      message = error.message;
    }

    try {
      await fs.unlink(req.file.path);
      cleanup = false;
    } catch (error) {
      logger.error('[/files] Error deleting file:', error);
    }
    res.status(500).json({ message });
  } finally {
    if (cleanup) {
      try {
        await fs.unlink(req.file.path);
      } catch (error) {
        logger.error('[/files] Error deleting file after file processing:', error);
      }
    } else {
      logger.debug('[/files] File processing completed without cleanup');
    }
  }
});

module.exports = router;
