import { FileSystemItem, File, Folder } from '@shared/types/file';
import { getAllFilesRaw, saveAllFiles, getAllFoldersRaw, saveAllFolders, StorageError } from './storage';
import * as FileFns from './file';
import * as FolderFns from './folder';

// Re-export error class
export { StorageError };

// Re-export storage raw functions for FileService
export { saveAllFiles, saveAllFolders };

// --- Composite & Helper Methods ---

const getItemsByPath = async (path: string): Promise<FileSystemItem[]> => {
  const files = await FileFns.getFilesByPath(path);
  const folders = await FolderFns.getFoldersByPath(path);

  const items: FileSystemItem[] = [
    ...folders.map(folder => ({ type: 'folder' as const, item: folder })),
    ...files.map(file => ({ type: 'file' as const, item: file })),
  ];

  return items;
};

const getItemsRecursively = async (
  rootPath: string,
  maxDepth: number
): Promise<FileSystemItem[]> => {
  // maxDepthが1の場合は、既存の単一階層取得関数を利用
  if (maxDepth === 1) {
    return getItemsByPath(rootPath);
  }

  const allFiles = await getAllFilesRaw();
  const allFolders = await getAllFoldersRaw();

  // パスは正規化済みと仮定
  const rootDepth = rootPath === '/' ? 0 : rootPath.split('/').length - 1;

  const filterByDepth = (item: File | Folder) => {
    if (!item.path.startsWith(rootPath)) return false;
    if (maxDepth === -1) return true; // -1は無限階層を示す

    const itemDepth = item.path === '/' ? 0 : item.path.split('/').length - 1;
    // 指定された階層内のアイテムをフィルタリング
    return itemDepth - rootDepth < maxDepth;
  };

  const filteredFiles = allFiles.filter(filterByDepth);
  const filteredFolders = allFolders.filter(filterByDepth);

  const items: FileSystemItem[] = [
    ...filteredFolders.map((folder) => ({ type: 'folder' as const, item: folder })),
    ...filteredFiles.map((file) => ({ type: 'file' as const, item: file })),
  ];

  return items;
};

const migrateExistingFiles = async (): Promise<void> => {
  const files = await getAllFilesRaw();
  let migrated = false;

  files.forEach(file => {
    if (!file.path) {
      file.path = '/';
      migrated = true;
    }
  });

  if (migrated) {
    await saveAllFiles(files);
    console.log('Migrated existing files to new path structure');
  }
};

// --- Main Export ---

export const FileListStorage = {
  // File functions
  ...FileFns,
  // Folder functions
  ...FolderFns,
  // Composite functions
  getItemsByPath,
  getItemsRecursively,
  migrateExistingFiles,
};
