/* eslint-disable i18next/no-literal-string */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Folder } from 'lucide-react';
import { useChatContext } from '~/Providers/ChatContext';
import { useAuthContext } from '~/hooks';
import type { ExtendedFile } from '~/common';

type FolderNode = {
  id: string | null;
  name: string;
  parent_id: string | null;
  created_at: string | null;
  children: FolderNode[];
  file_count?: number;
  virtual?: boolean;
};

type ManagedFile = {
  id: string;
  file_id: string;
  filename: string;
  type: string;
  size: number;
  status: string;
  folder_id: string | null;
  folder_name?: string | null;
  filepath: string;
  source?: string;
  metadata?: Record<string, unknown>;
  height?: number;
  width?: number;
  created_at?: string;
  updated_at?: string;
};

type FilesResponse = {
  files: ManagedFile[];
  total_count: number;
  next_cursor: string | null;
  prev_cursor: string | null;
};

type FocusedNode =
  | { type: 'root' }
  | { type: 'folder'; id: string }
  | { type: 'file'; id: string }
  | { type: 'unfiled' };

type SelectionCheckboxProps = {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
};

const FETCH_LIMIT = 100;
const ROOT_ID = '__root__';
const UNFILED_ID = '__unfiled__';

async function apiFetch<T>(path: string, token?: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/files${path}`, {
    credentials: token ? 'omit' : 'include',
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      message = body?.message ?? message;
    } catch {
      // noop
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

async function fetchAllManagedFiles(token?: string): Promise<ManagedFile[]> {
  const allFiles: ManagedFile[] = [];
  let page = 1;

  while (true) {
    const search = new URLSearchParams({
      page: String(page),
      limit: String(FETCH_LIMIT),
      sort: 'filename_asc',
    });

    const response = await apiFetch<FilesResponse>(`/manager?${search.toString()}`, token);
    allFiles.push(...response.files);

    if (!response.next_cursor) {
      break;
    }

    const nextPage = Number(response.next_cursor);
    page = Number.isFinite(nextPage) && nextPage > page ? nextPage : page + 1;
  }

  return allFiles;
}

function SelectionCheckbox({ checked, indeterminate = false, onChange }: SelectionCheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={inputRef}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="h-4 w-4 shrink-0"
    />
  );
}

function getFileBadgeLabel(file: ManagedFile): string {
  const extension = file.filename.split('.').pop()?.toLowerCase();

  if (extension === 'pdf') {
    return 'PDF';
  }
  if (extension === 'doc' || extension === 'docx') {
    return 'DOC';
  }
  if (extension === 'xls' || extension === 'xlsx' || extension === 'csv') {
    return 'XLS';
  }
  if (extension === 'ppt' || extension === 'pptx') {
    return 'PPT';
  }
  if (extension === 'png' || extension === 'jpg' || extension === 'jpeg') {
    return 'IMG';
  }
  if (extension === 'txt') {
    return 'TXT';
  }

  return extension?.slice(0, 4).toUpperCase() || 'FILE';
}

function formatFileCount(count: number): string {
  return `${count} file${count === 1 ? '' : 's'}`;
}

function flattenFolders(nodes: FolderNode[]): FolderNode[] {
  return nodes.flatMap((node) => [node, ...flattenFolders(node.children ?? [])]);
}

export default function FilesPanel() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setFiles } = useChatContext();
  const { token, user } = useAuthContext();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set([ROOT_ID, UNFILED_ID]));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedNode, setFocusedNode] = useState<FocusedNode>({ type: 'root' });
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: folderTree = [], isLoading: foldersLoading } = useQuery({
    queryKey: ['fm-folders'],
    queryFn: () => apiFetch<FolderNode[]>('/folders', token),
    enabled: !!token,
    staleTime: 8_000,
    refetchInterval: 8_000,
  });

  const { data: managedFiles = [], isLoading: filesLoading } = useQuery({
    queryKey: ['fm-files-all'],
    queryFn: () => fetchAllManagedFiles(token),
    enabled: !!token,
    staleTime: 8_000,
    refetchInterval: 8_000,
  });

  const displayName =
    user?.name?.trim() || user?.username?.trim() || user?.email?.trim() || 'My Files';

  const realFolders = useMemo(
    () => flattenFolders(folderTree.filter((folder) => !folder.virtual)),
    [folderTree],
  );

  const explorerModel = useMemo(() => {
    const foldersById = new Map<string, FolderNode>();
    const childFolderIdsByParentId = new Map<string | null, string[]>();
    const filesByFolderId = new Map<string | null, ManagedFile[]>();
    const filesById = new Map<string, ManagedFile>();

    realFolders.forEach((folder) => {
      if (!folder.id) {
        return;
      }
      foldersById.set(folder.id, folder);
      const parentId = folder.parent_id ?? null;
      const existing = childFolderIdsByParentId.get(parentId) ?? [];
      existing.push(folder.id);
      childFolderIdsByParentId.set(parentId, existing);
    });

    childFolderIdsByParentId.forEach((childIds) => {
      childIds.sort((a, b) => {
        const aName = foldersById.get(a)?.name ?? '';
        const bName = foldersById.get(b)?.name ?? '';
        return aName.localeCompare(bName);
      });
    });

    managedFiles.forEach((file) => {
      filesById.set(file.id, file);
      const folderId = file.folder_id ?? null;
      const existing = filesByFolderId.get(folderId) ?? [];
      existing.push(file);
      filesByFolderId.set(folderId, existing);
    });

    filesByFolderId.forEach((files) => files.sort((a, b) => a.filename.localeCompare(b.filename)));

    const subtreeFileIdsCache = new Map<string, string[]>();
    const subtreeCountCache = new Map<string, number>();
    const branchMatchCache = new Map<string, boolean>();
    const normalizedSearch = searchQuery.trim().toLowerCase();

    const directFilesForFolder = (folderId: string | null) => filesByFolderId.get(folderId) ?? [];
    const childFolderIdsForParent = (parentId: string | null) =>
      childFolderIdsByParentId.get(parentId) ?? [];

    const getSubtreeFileIds = (folderId: string): string[] => {
      const cached = subtreeFileIdsCache.get(folderId);
      if (cached) {
        return cached;
      }

      const directIds = directFilesForFolder(folderId).map((file) => file.id);
      const nestedIds = childFolderIdsForParent(folderId).flatMap((childId) => getSubtreeFileIds(childId));
      const result = [...directIds, ...nestedIds];
      subtreeFileIdsCache.set(folderId, result);
      return result;
    };

    const getSubtreeCount = (folderId: string): number => {
      const cached = subtreeCountCache.get(folderId);
      if (cached != null) {
        return cached;
      }

      const count = getSubtreeFileIds(folderId).length;
      subtreeCountCache.set(folderId, count);
      return count;
    };

    const fileMatches = (file: ManagedFile) =>
      normalizedSearch.length === 0 || file.filename.toLowerCase().includes(normalizedSearch);

    const folderMatches = (folderId: string) =>
      normalizedSearch.length > 0 &&
      (foldersById.get(folderId)?.name.toLowerCase().includes(normalizedSearch) ?? false);

    const branchHasMatch = (folderId: string): boolean => {
      if (!normalizedSearch) {
        return true;
      }

      const cached = branchMatchCache.get(folderId);
      if (cached != null) {
        return cached;
      }

      const hasDirectFileMatch = directFilesForFolder(folderId).some(fileMatches);
      const hasChildMatch = childFolderIdsForParent(folderId).some((childId) => branchHasMatch(childId));
      const result = folderMatches(folderId) || hasDirectFileMatch || hasChildMatch;
      branchMatchCache.set(folderId, result);
      return result;
    };

    const getVisibleChildFolderIds = (parentId: string | null): string[] => {
      const childIds = childFolderIdsForParent(parentId);
      if (!normalizedSearch) {
        return childIds;
      }
      return childIds.filter((childId) => branchHasMatch(childId));
    };

    const getVisibleFiles = (folderId: string | null): ManagedFile[] => {
      const files = directFilesForFolder(folderId);
      if (!normalizedSearch) {
        return files;
      }
      return files.filter(fileMatches);
    };

    const getFolderSelectionState = (folderId: string) => {
      const fileIds = getSubtreeFileIds(folderId);
      if (fileIds.length === 0) {
        return { checked: false, indeterminate: false, fileIds };
      }

      const selectedCount = fileIds.filter((fileId) => selectedIds.has(fileId)).length;

      return {
        checked: selectedCount === fileIds.length,
        indeterminate: selectedCount > 0 && selectedCount < fileIds.length,
        fileIds,
      };
    };

    const unfiledFiles = getVisibleFiles(null);
    const topLevelFolderIds = getVisibleChildFolderIds(null);

    return {
      foldersById,
      filesById,
      getSubtreeFileIds,
      getSubtreeCount,
      getVisibleChildFolderIds,
      getVisibleFiles,
      getFolderSelectionState,
      unfiledFiles,
      topLevelFolderIds,
      isSearching: normalizedSearch.length > 0,
    };
  }, [managedFiles, realFolders, searchQuery, selectedIds]);

  const selectedFiles = useMemo(
    () =>
      Array.from(selectedIds)
        .map((id) => explorerModel.filesById.get(id))
        .filter((file): file is ManagedFile => Boolean(file)),
    [explorerModel.filesById, selectedIds],
  );

  useEffect(() => {
    if (!selectedFolderId) {
      return;
    }

    if (!explorerModel.foldersById.has(selectedFolderId)) {
      setSelectedFolderId(null);
    }
  }, [explorerModel.foldersById, selectedFolderId]);

  const uploadTargetFolderId = selectedFolderId;

  const createFolderMutation = useMutation({
    mutationFn: ({ name, parent_id }: { name: string; parent_id: string | null }) =>
      apiFetch<FolderNode>('/folders', token, {
        method: 'POST',
        body: JSON.stringify({ name, parent_id }),
      }),
    onSuccess: (_data, variables) => {
      if (variables.parent_id) {
        setExpandedIds((current) => new Set(current).add(variables.parent_id as string));
      }
      queryClient.invalidateQueries({ queryKey: ['fm-folders'] });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (folderId: string) =>
      apiFetch(`/folders/${folderId}`, token, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      setFocusedNode({ type: 'root' });
      setSelectedFolderId(null);
      queryClient.invalidateQueries({ queryKey: ['fm-folders'] });
      queryClient.invalidateQueries({ queryKey: ['fm-files-all'] });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, targetFolderId }: { file: File; targetFolderId: string | null }) => {
      const formData = new FormData();
      if (targetFolderId) {
        formData.append('folder_id', targetFolderId);
      }
      formData.append('file', file, encodeURIComponent(file.name));
      const uploadPath = targetFolderId
        ? `/manager/upload?folder_id=${encodeURIComponent(targetFolderId)}`
        : '/manager/upload';
      return apiFetch<ManagedFile>(uploadPath, token, {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fm-files-all'] });
      queryClient.invalidateQueries({ queryKey: ['fm-folders'] });
    },
  });

  const deleteFilesMutation = useMutation({
    mutationFn: (fileIds: string[]) =>
      apiFetch('/manager/bulk-delete', token, {
        method: 'POST',
        body: JSON.stringify({ file_ids: fileIds }),
      }),
    onSuccess: () => {
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['fm-files-all'] });
      queryClient.invalidateQueries({ queryKey: ['fm-folders'] });
    },
  });

  const attachSelected = () => {
    if (!selectedFiles.length) {
      return;
    }

    setFiles((currentFiles) => {
      const nextFiles = new Map(currentFiles);

      selectedFiles.forEach((file) => {
        const chatFile: ExtendedFile = {
          progress: 1,
          attached: true,
          file_id: file.id,
          filepath: file.filepath,
          preview: file.filepath,
          type: file.type,
          height: file.height,
          width: file.width,
          filename: file.filename,
          source: file.source as ExtendedFile['source'],
          size: file.size,
          metadata: file.metadata as ExtendedFile['metadata'],
        };

        nextFiles.set(file.id, chatFile);
      });

      return nextFiles;
    });

    setSelectedIds(new Set());
  };

  const toggleExpanded = (folderId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const toggleFolderSelection = (folderId: string) => {
    const { checked, fileIds } = explorerModel.getFolderSelectionState(folderId);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        fileIds.forEach((fileId) => next.delete(fileId));
      } else {
        fileIds.forEach((fileId) => next.add(fileId));
      }
      return next;
    });
  };

  const toggleUnfiledSelection = () => {
    const fileIds = explorerModel.unfiledFiles.map((file) => file.id);
    const allSelected = fileIds.length > 0 && fileIds.every((fileId) => selectedIds.has(fileId));

    setSelectedIds((current) => {
      const next = new Set(current);
      if (allSelected) {
        fileIds.forEach((fileId) => next.delete(fileId));
      } else {
        fileIds.forEach((fileId) => next.add(fileId));
      }
      return next;
    });
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFilesToUpload = Array.from(event.target.files ?? []);
    for (const file of selectedFilesToUpload) {
      await uploadMutation.mutateAsync({ file, targetFolderId: uploadTargetFolderId });
    }
    event.target.value = '';
  };

  const handleCreateFolder = () => {
    const name = window.prompt('Folder name');
    if (!name || !name.trim()) {
      return;
    }

    createFolderMutation.mutate({ name: name.trim(), parent_id: uploadTargetFolderId });
  };

  const handleDeleteFocusedFolder = () => {
    if (!selectedFolderId) {
      return;
    }

    const folderId = selectedFolderId;
    const hasChildren = realFolders.some((folder) => folder.parent_id === folderId);
    if (hasChildren) {
      window.alert('Delete child folders first.');
      return;
    }

    const folder = explorerModel.foldersById.get(folderId);
    if (!folder) {
      return;
    }

    if (window.confirm(`Delete folder "${folder.name}"? Files will become unfiled.`)) {
      deleteFolderMutation.mutate(folderId);
    }
  };

  const unfiledSelectedCount = explorerModel.unfiledFiles.filter((file) => selectedIds.has(file.id)).length;
  const unfiledChecked =
    explorerModel.unfiledFiles.length > 0 && unfiledSelectedCount === explorerModel.unfiledFiles.length;
  const unfiledIndeterminate =
    unfiledSelectedCount > 0 && unfiledSelectedCount < explorerModel.unfiledFiles.length;

  const renderFileRow = (file: ManagedFile, depth: number) => {
    const isFocused = focusedNode.type === 'file' && focusedNode.id === file.id;

    return (
      <div
        key={file.id}
        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
          isFocused ? 'bg-surface-hover' : 'hover:bg-surface-hover'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => {
          setFocusedNode({ type: 'file', id: file.id });
        }}
      >
        <div onClick={(event) => event.stopPropagation()}>
          <SelectionCheckbox
            checked={selectedIds.has(file.id)}
            onChange={() => toggleFileSelection(file.id)}
          />
        </div>
        <span className="inline-flex min-w-10 items-center justify-center rounded border border-border-light px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary">
          {getFileBadgeLabel(file)}
        </span>
        <span className="truncate">{file.filename}</span>
      </div>
    );
  };

  const renderFolderRow = (folderId: string, depth: number): React.ReactNode => {
    const folder = explorerModel.foldersById.get(folderId);
    if (!folder) {
      return null;
    }

    const childFolderIds = explorerModel.getVisibleChildFolderIds(folderId);
    const visibleFiles = explorerModel.getVisibleFiles(folderId);
    const hasChildren = childFolderIds.length > 0 || visibleFiles.length > 0;
    const isExpanded = explorerModel.isSearching ? true : expandedIds.has(folderId);
    const isFocused =
      selectedFolderId === folderId || (focusedNode.type === 'folder' && focusedNode.id === folderId);
    const selectionState = explorerModel.getFolderSelectionState(folderId);

    return (
      <div key={folderId} className="space-y-1">
        <div
          className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
            isFocused ? 'bg-surface-hover' : 'hover:bg-surface-hover'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            setFocusedNode({ type: 'folder', id: folderId });
            setSelectedFolderId(folderId);
            if (hasChildren) {
              toggleExpanded(folderId);
            }
          }}
        >
          <div onClick={(event) => event.stopPropagation()}>
            <SelectionCheckbox
              checked={selectionState.checked}
              indeterminate={selectionState.indeterminate}
              onChange={() => toggleFolderSelection(folderId)}
            />
          </div>
          <span
            className="inline-flex h-4 w-4 items-center justify-center text-xs text-text-secondary"
            onClick={(event) => {
              event.stopPropagation();
              if (hasChildren) {
                toggleExpanded(folderId);
              }
            }}
          >
            {hasChildren ? (isExpanded ? '▾' : '▸') : '•'}
          </span>
          <Folder className="h-5 w-5 shrink-0 text-text-primary" strokeWidth={1.8} />
          <span className="truncate">{folder.name}</span>
          <span className="ml-auto text-xs text-text-secondary">
            {formatFileCount(explorerModel.getSubtreeCount(folderId))}
          </span>
        </div>

        {isExpanded ? (
          <div className="space-y-1">
            {childFolderIds.map((childId) => renderFolderRow(childId, depth + 1))}
            {visibleFiles.map((file) => renderFileRow(file, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  const isLoading = foldersLoading || filesLoading;
  const hasAnyVisibleContent =
    explorerModel.topLevelFolderIds.length > 0 || explorerModel.unfiledFiles.length > 0;

  return (
    <div className="h-auto max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-3 rounded-lg border border-border-light p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">File Manager</div>
            <div className="text-xs text-text-secondary">Nyay AI File Manager</div>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 ? (
              <button
                type="button"
                className="rounded-md border border-border-light px-2 py-1 text-xs text-red-500"
                onClick={() => deleteFilesMutation.mutate(Array.from(selectedIds))}
                disabled={deleteFilesMutation.isLoading}
              >
                Delete File(s)
              </button>
            ) : null}
            {selectedFolderId ? (
              <button
                type="button"
                className="rounded-md border border-border-light px-2 py-1 text-xs text-red-500"
                onClick={handleDeleteFocusedFolder}
              >
                Delete Folder
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-md border border-border-light px-2 py-1 text-xs"
              onClick={handleCreateFolder}
            >
              New Folder
            </button>
            <button
              type="button"
              className="rounded-md border border-border-light px-2 py-1 text-xs"
              onClick={handleUploadClick}
            >
              Upload
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />
          </div>
        </div>

        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search folders and files"
          className="w-full rounded-md border border-border-light bg-transparent px-3 py-2 text-sm"
        />

        <div className="max-h-[520px] overflow-y-auto rounded-md border border-border-light p-2">
          {isLoading ? <div className="text-sm text-text-secondary">Loading files…</div> : null}
          {!isLoading ? (
            <div className="space-y-1">
              <div
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                  focusedNode.type === 'root' ? 'bg-surface-hover' : 'hover:bg-surface-hover'
                }`}
                onClick={() => {
                  setFocusedNode({ type: 'root' });
                  setSelectedFolderId(null);
                }}
              >
                <span
                  className="inline-flex h-4 w-4 items-center justify-center text-xs text-text-secondary"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleExpanded(ROOT_ID);
                  }}
                >
                  {expandedIds.has(ROOT_ID) || explorerModel.isSearching ? '▾' : '▸'}
                </span>
                <span className="text-base">👤</span>
                <span className="truncate">{displayName}</span>
                <span className="ml-auto text-xs text-text-secondary">
                  {formatFileCount(managedFiles.length)}
                </span>
              </div>

              {expandedIds.has(ROOT_ID) || explorerModel.isSearching ? (
                <div className="space-y-1">
                  {explorerModel.topLevelFolderIds.map((folderId) => renderFolderRow(folderId, 1))}

                  {(explorerModel.unfiledFiles.length > 0 || searchQuery.trim().length === 0) ? (
                    <div className="space-y-1">
                      <div
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                          focusedNode.type === 'unfiled' ? 'bg-surface-hover' : 'hover:bg-surface-hover'
                        }`}
                        style={{ paddingLeft: '24px' }}
                        onClick={() => {
                          setFocusedNode({ type: 'unfiled' });
                          setSelectedFolderId(null);
                          toggleExpanded(UNFILED_ID);
                        }}
                      >
                        <div onClick={(event) => event.stopPropagation()}>
                          <SelectionCheckbox
                            checked={unfiledChecked}
                            indeterminate={unfiledIndeterminate}
                            onChange={toggleUnfiledSelection}
                          />
                        </div>
                        <span
                          className="inline-flex h-4 w-4 items-center justify-center text-xs text-text-secondary"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleExpanded(UNFILED_ID);
                          }}
                        >
                          {expandedIds.has(UNFILED_ID) || explorerModel.isSearching ? '▾' : '▸'}
                        </span>
                        <Folder className="h-5 w-5 shrink-0 text-text-primary" strokeWidth={1.8} />
                        <span className="truncate">Unfiled</span>
                        <span className="ml-auto text-xs text-text-secondary">
                          {formatFileCount(explorerModel.unfiledFiles.length)}
                        </span>
                      </div>

                      {expandedIds.has(UNFILED_ID) || explorerModel.isSearching ? (
                        <div className="space-y-1">
                          {explorerModel.unfiledFiles.map((file) => renderFileRow(file, 2))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {!isLoading && !hasAnyVisibleContent ? (
            <div className="text-sm text-text-secondary">No files or folders found.</div>
          ) : null}
        </div>

        {uploadMutation.isLoading ? (
          <div className="text-xs text-text-secondary">Uploading…</div>
        ) : null}

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex-1 rounded-md border border-border-light bg-surface-hover px-3 py-2 text-sm disabled:opacity-50"
            disabled={selectedIds.size === 0}
            onClick={attachSelected}
          >
            Attach to AI{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
          </button>
          <button
            type="button"
            className="rounded-md border border-border-light px-3 py-2 text-sm disabled:opacity-50"
            disabled={selectedIds.size === 0 || deleteFilesMutation.isLoading}
            onClick={() => deleteFilesMutation.mutate(Array.from(selectedIds))}
          >
            Delete File(s)
          </button>
        </div>
      </div>
    </div>
  );
}
