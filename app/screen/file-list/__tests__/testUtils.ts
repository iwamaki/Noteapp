// app/screen/file-list/__tests__/testUtils.ts
import { File, Folder } from '@shared/types/file';

/**
 * テスト用のモックデータ生成ユーティリティ
 */

export const createMockNote = (overrides: Partial<File> = {}): File => {
  const now = new Date();
  return {
    id: `note-${Date.now()}-${Math.random()}`,
    title: 'Test Note',
    content: 'Test content',
    tags: [],
    path: '/',
    createdAt: now,
    updatedAt: now,
    version: 1,
    ...overrides,
  };
};

export const createMockFolder = (overrides: Partial<Folder> = {}): Folder => {
  const now = new Date();
  return {
    id: `folder-${Date.now()}-${Math.random()}`,
    name: 'Test Folder',
    path: '/',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

export const createMockNotes = (count: number, basePath: string = '/'): File[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockNote({
      title: `Note ${i + 1}`,
      content: `Content for file ${i + 1}`,
      path: basePath,
    })
  );
};

export const createMockFolders = (count: number, basePath: string = '/'): Folder[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockFolder({
      name: `Folder ${i + 1}`,
      path: basePath,
    })
  );
};

/**
 * ストレージのモック
 */
export const createStorageMock = () => {
  const files: File[] = [];
  const folders: Folder[] = [];

  return {
    getAllNotes: jest.fn().mockResolvedValue(files),
    getAllFolders: jest.fn().mockResolvedValue(folders),
    createNote: jest.fn().mockImplementation((file: File) => {
      files.push(file);
      return Promise.resolve(file);
    }),
    createFolder: jest.fn().mockImplementation((folder: Folder) => {
      folders.push(folder);
      return Promise.resolve(folder);
    }),
    deleteNotes: jest.fn().mockImplementation((ids: string[]) => {
      const remaining = files.filter(n => !ids.includes(n.id));
      files.length = 0;
      files.push(...remaining);
      return Promise.resolve();
    }),
    deleteFolder: jest.fn().mockImplementation((id: string) => {
      const remaining = folders.filter(f => f.id !== id);
      folders.length = 0;
      folders.push(...remaining);
      return Promise.resolve();
    }),
    // データをリセット
    reset: () => {
      files.length = 0;
      folders.length = 0;
    },
    // データを設定
    setNotes: (newNotes: File[]) => {
      files.length = 0;
      files.push(...newNotes);
    },
    setFolders: (newFolders: Folder[]) => {
      folders.length = 0;
      folders.push(...newFolders);
    },
  };
};

/**
 * FileServiceのテスト例
 */
export const noteServiceTestSuite = {
  'should delete notes and folders': async () => {
    // テストの実装例
  },
  'should validate move operations': async () => {
    // テストの実装例
  },
  'should prevent moving folder into itself': async () => {
    // テストの実装例
  },
};