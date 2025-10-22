import { v4 as uuidv4 } from 'uuid';
import { Folder, CreateFolderData, UpdateFolderData } from '@shared/types/file';
import { PathService } from '../../../services/PathService';
import { getAllFoldersRaw, saveAllFolders, getAllFilesRaw, saveAllFiles, StorageError } from './storage';
import { getFilesByPath } from './file';

export const getAllFolders = async (): Promise<Folder[]> => {
  return await getAllFoldersRaw();
};

export const getFoldersByPath = async (path: string): Promise<Folder[]> => {
  const folders = await getAllFoldersRaw();
  // パスは正規化済みと仮定して、単純な文字列比較を行う
  return folders.filter(folder => folder.path === path);
};

export const createFolder = async (data: CreateFolderData): Promise<Folder> => {
  const now = new Date();
  // パスは呼び出し側で正規化済みと仮定

  const newFolder: Folder = {
    id: uuidv4(),
    name: data.name,
    path: data.path,
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

  // 単純にフォルダ自身のデータのみを更新
  // 重複チェックと子要素のパス更新は呼び出し側（NoteService）が行う
  if (data.name !== undefined) {
    folderToUpdate.name = data.name;
  }
  if (data.path !== undefined) {
    folderToUpdate.path = data.path;
  }
  folderToUpdate.updatedAt = new Date();

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
  const folderPath = PathService.getFullPath(folderToDelete.path, folderToDelete.name, 'folder');

  if (deleteContents) {
    let allFiles = await getAllFilesRaw();

    // Filter files: keep those that are not in the folder path or any sub-path.
    const finalFiles = allFiles.filter(file => !file.path.startsWith(folderPath));

    // Filter folders: keep those whose full path does not start with the folder path.
    // This will also remove the folder itself.
    const finalFolders = allFolders.filter(folder => {
        const fullPath = PathService.getFullPath(folder.path, folder.name, 'folder');
        return !fullPath.startsWith(folderPath);
    });

    await saveAllFiles(finalFiles);
    await saveAllFolders(finalFolders);

  } else {
    // Folder must be empty
    const notesInFolder = await getFilesByPath(folderPath);
    const foldersInFolder = await getFoldersByPath(folderPath);
    if (notesInFolder.length > 0 || foldersInFolder.length > 0) {
      throw new StorageError('Folder is not empty', 'FOLDER_NOT_EMPTY');
    }
    // Just delete the folder
    allFolders.splice(folderIndex, 1);
    await saveAllFolders(allFolders);
  }
};
