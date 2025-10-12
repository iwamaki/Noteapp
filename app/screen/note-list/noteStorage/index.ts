import { FileSystemItem, Note } from '@shared/types/note';
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
  migrateExistingNotes,
  createNoteWithPath,
  ensureFoldersExist,
};
