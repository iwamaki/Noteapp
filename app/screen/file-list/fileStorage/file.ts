import { v4 as uuidv4 } from 'uuid';
import { File, CreateFileData } from '@shared/types/file';
import { getAllFilesRaw, saveAllFiles, StorageError } from './storage';

export interface UpdateFileData {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
  path?: string;
}

export const getAllFiles = async (): Promise<File[]> => {
  const files = await getAllFilesRaw();
  return files.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
};

export const getFilesByPath = async (path: string): Promise<File[]> => {
  const files = await getAllFilesRaw();
  // パスは正規化済みと仮定して、単純な文字列比較を行う
  return files
    .filter(file => file.path === path)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
};

export const deleteFiles = async (fileIds: string[]): Promise<void> => {
  let files = await getAllFilesRaw();
  files = files.filter(file => !fileIds.includes(file.id));
  await saveAllFiles(files);
};

export const copyFiles = async (sourceIds: string[]): Promise<File[]> => {
  const files = await getAllFilesRaw();
  const copiedFiles: File[] = [];
  const now = new Date();

  for (const id of sourceIds) {
    const fileToCopy = files.find(file => file.id === id);
    if (fileToCopy) {
      // Find a unique title for the copied file
      let newTitle = `Copy of ${fileToCopy.title}`;
      let counter = 1;

      // Check if the title already exists, and if so, add a number
      // パスは正規化済みと仮定して、単純な文字列比較を行う
      while (
        files.some(n => n.path === fileToCopy.path && n.title === newTitle) ||
        copiedFiles.some(n => n.path === fileToCopy.path && n.title === newTitle)
      ) {
        newTitle = `Copy of ${fileToCopy.title} (${counter})`;
        counter++;
      }

      const newFile: File = {
        ...fileToCopy,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
        title: newTitle,
        version: 1,
      };
      copiedFiles.push(newFile);
    }
  }

  if (copiedFiles.length > 0) {
    await saveAllFiles([...files, ...copiedFiles]);
  }
  return copiedFiles;
};

export const createFile = async (data: CreateFileData): Promise<File> => {
  const now = new Date();
  // パスは呼び出し側で正規化済みと仮定
  // 重複チェックは呼び出し側（FileService）が行う

  const newFile: File = {
    id: uuidv4(),
    title: data.title,
    content: data.content,
    tags: data.tags || [],
    path: data.path || '/',
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  const files = await getAllFilesRaw();
  files.push(newFile);
  await saveAllFiles(files);
  return newFile;
};

export const updateFile = async (data: UpdateFileData): Promise<File> => {
  const files = await getAllFilesRaw();
  const fileIndex = files.findIndex(n => n.id === data.id);

  if (fileIndex === -1) {
    throw new StorageError(`File with id ${data.id} not found`, 'NOT_FOUND');
  }

  const existingFile = files[fileIndex];
  // 重複チェックは呼び出し側（FileService）が行う

  const updatedFile = {
    ...existingFile,
    ...data,
    updatedAt: new Date(),
  };
  files[fileIndex] = updatedFile;
  await saveAllFiles(files);
  return updatedFile;
};

export const moveFile = async (fileId: string, newPath: string): Promise<File> => {
  const files = await getAllFilesRaw();
  const fileIndex = files.findIndex(n => n.id === fileId);

  if (fileIndex === -1) {
    throw new StorageError(`File with id ${fileId} not found`, 'NOT_FOUND');
  }

  // パスは呼び出し側で正規化済みと仮定
  // 重複チェックは呼び出し側（FileService）が行う

  files[fileIndex].path = newPath;
  files[fileIndex].updatedAt = new Date();
  await saveAllFiles(files);
  return files[fileIndex];
};
