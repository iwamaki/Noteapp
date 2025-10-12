import { v4 as uuidv4 } from 'uuid';
import { Folder, CreateFolderData, UpdateFolderData } from '@shared/types/note';
import { PathUtils } from '../utils/pathUtils';
import { getAllFoldersRaw, saveAllFolders, getAllNotesRaw, saveAllNotes } from './raw';
import { StorageError } from './error';
import { getNotesByPath } from './note';

export const getAllFolders = async (): Promise<Folder[]> => {
  return await getAllFoldersRaw();
};

export const getFoldersByPath = async (path: string): Promise<Folder[]> => {
  const folders = await getAllFoldersRaw();
  const normalizedPath = PathUtils.normalizePath(path);
  return folders.filter(folder => PathUtils.normalizePath(folder.path) === normalizedPath);
};

export const createFolder = async (data: CreateFolderData): Promise<Folder> => {
  const now = new Date();
  const newFolder: Folder = {
    id: uuidv4(),
    name: data.name,
    path: PathUtils.normalizePath(data.path),
    createdAt: now,
    updatedAt: now,
  };

  const folders = await getAllFoldersRaw();
  folders.push(newFolder);
  await saveAllFolders(folders);
  return newFolder;
};

export const updateFolder = async (data: UpdateFolderData): Promise<Folder> => {
  const allFolders = await getAllFoldersRaw();
  const folderIndex = allFolders.findIndex(f => f.id === data.id);

  if (folderIndex === -1) {
    throw new StorageError(`Folder with id ${data.id} not found`, 'NOT_FOUND');
  }

  const folderToUpdate = allFolders[folderIndex];
  const oldFullPath = PathUtils.getFullPath(folderToUpdate.path, folderToUpdate.name);

  const newName = data.name ?? folderToUpdate.name;
  const newPath = data.path ? PathUtils.normalizePath(data.path) : folderToUpdate.path;
  const newFullPath = PathUtils.getFullPath(newPath, newName);

  if (oldFullPath === newFullPath && folderToUpdate.name === newName && folderToUpdate.path === newPath) {
    return folderToUpdate;
  }
  
  folderToUpdate.name = newName;
  folderToUpdate.path = newPath;
  folderToUpdate.updatedAt = new Date();

  if (oldFullPath !== newFullPath) {
    const allNotes = await getAllNotesRaw();

    allNotes.forEach(note => {
      if (note.path === oldFullPath) {
        note.path = newFullPath;
      } else if (note.path.startsWith(oldFullPath + '/')) {
        note.path = newFullPath + note.path.substring(oldFullPath.length);
      }
    });

    allFolders.forEach(folder => {
      if (folder.id === data.id) return;

      if (folder.path === oldFullPath) {
        folder.path = newFullPath;
      } else if (folder.path.startsWith(oldFullPath + '/')) {
        folder.path = newFullPath + folder.path.substring(oldFullPath.length);
      }
    });
    
    await saveAllNotes(allNotes);
  }

  await saveAllFolders(allFolders);
  return folderToUpdate;
};

export const deleteFolder = async (folderId: string, deleteContents: boolean = false): Promise<void> => {
  let allFolders = await getAllFoldersRaw();
  const folderIndex = allFolders.findIndex(f => f.id === folderId);

  if (folderIndex === -1) {
    throw new StorageError(`Folder with id ${folderId} not found`, 'NOT_FOUND');
  }

  const folderToDelete = allFolders[folderIndex];
  const folderPath = PathUtils.getFullPath(folderToDelete.path, folderToDelete.name);

  if (deleteContents) {
    let allNotes = await getAllNotesRaw();

    // Filter notes: keep those that are not in the folder path or any sub-path.
    const finalNotes = allNotes.filter(note => !note.path.startsWith(folderPath));

    // Filter folders: keep those whose full path does not start with the folder path.
    // This will also remove the folder itself.
    const finalFolders = allFolders.filter(folder => {
        const fullPath = PathUtils.getFullPath(folder.path, folder.name);
        return !fullPath.startsWith(folderPath);
    });

    await saveAllNotes(finalNotes);
    await saveAllFolders(finalFolders);

  } else {
    // Folder must be empty
    const notesInFolder = await getNotesByPath(folderPath);
    const foldersInFolder = await getFoldersByPath(folderPath);
    if (notesInFolder.length > 0 || foldersInFolder.length > 0) {
      throw new StorageError('Folder is not empty', 'FOLDER_NOT_EMPTY');
    }
    // Just delete the folder
    allFolders.splice(folderIndex, 1);
    await saveAllFolders(allFolders);
  }
};
