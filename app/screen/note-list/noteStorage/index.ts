import { FileSystemItem, Note, Folder } from '@shared/types/note';
import { PathUtils } from '../utils/pathUtils';
import { getAllNotesRaw, saveAllNotes, getAllFoldersRaw, StorageError } from './storage';
import * as NoteFns from './note';
import * as FolderFns from './folder';

// Re-export error class
export { StorageError };

// --- Composite & Helper Methods ---

const getItemsByPath = async (path: string): Promise<FileSystemItem[]> => {
  const notes = await NoteFns.getNotesByPath(path);
  const folders = await FolderFns.getFoldersByPath(path);

  const items: FileSystemItem[] = [
    ...folders.map(folder => ({ type: 'folder' as const, item: folder })),
    ...notes.map(note => ({ type: 'note' as const, item: note })),
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

  const allNotes = await getAllNotesRaw();
  const allFolders = await getAllFoldersRaw();

  const normalizedRootPath = PathUtils.normalizePath(rootPath);
  const rootDepth = normalizedRootPath === '/' ? 0 : normalizedRootPath.split('/').length - 1;

  const filterByDepth = (item: Note | Folder) => {
    const itemPath = PathUtils.normalizePath(item.path);
    if (!itemPath.startsWith(normalizedRootPath)) return false;
    if (maxDepth === -1) return true; // -1は無限階層を示す

    const itemDepth = itemPath === '/' ? 0 : itemPath.split('/').length - 1;
    // 指定された階層内のアイテムをフィルタリング
    return itemDepth - rootDepth < maxDepth;
  };

  const filteredNotes = allNotes.filter(filterByDepth);
  const filteredFolders = allFolders.filter(filterByDepth);

  const items: FileSystemItem[] = [
    ...filteredFolders.map((folder) => ({ type: 'folder' as const, item: folder })),
    ...filteredNotes.map((note) => ({ type: 'note' as const, item: note })),
  ];

  return items;
};

const migrateExistingNotes = async (): Promise<void> => {
  const notes = await getAllNotesRaw();
  let migrated = false;

  notes.forEach(note => {
    if (!note.path) {
      note.path = '/';
      migrated = true;
    }
  });

  if (migrated) {
    await saveAllNotes(notes);
    console.log('Migrated existing notes to new path structure');
  }
};

const ensureFoldersExist = async (folderNames: string[], basePath: string = '/'): Promise<string> => {
  if (folderNames.length === 0) {
    return PathUtils.normalizePath(basePath);
  }

  const folders = await getAllFoldersRaw();
  let currentPath = PathUtils.normalizePath(basePath);

  for (const folderName of folderNames) {
    const fullPath = PathUtils.getFullPath(currentPath, folderName);

    const existingFolder = folders.find(
      f => PathUtils.getFullPath(f.path, f.name) === fullPath
    );

    if (!existingFolder) {
      const newFolder = await FolderFns.createFolder({
        name: folderName,
        path: currentPath,
      });
      folders.push(newFolder);
    }

    currentPath = fullPath;
  }

  return currentPath;
};

const createNoteWithPath = async (inputPath: string, basePath: string = '/'): Promise<Note> => {
  const { folders, fileName } = PathUtils.parseInputPath(inputPath);
  const targetPath = await ensureFoldersExist(folders, basePath);

  return await NoteFns.createNote({
    title: fileName,
    content: '',
    path: targetPath,
  });
};


// --- Main Export ---

export const NoteListStorage = {
  // Note functions
  ...NoteFns,
  // Folder functions
  ...FolderFns,
  // Composite functions
  getItemsByPath,
  getItemsRecursively,
  migrateExistingNotes,
  createNoteWithPath,
  ensureFoldersExist,
};
