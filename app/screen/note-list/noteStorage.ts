import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { Note, CreateNoteData, Folder, CreateFolderData, UpdateFolderData, FileSystemItem } from '../../../shared/types/note';

const NOTES_STORAGE_KEY = '@notes';
const FOLDERS_STORAGE_KEY = '@folders';

import StorageUtils from '@data/asyncStorageUtils';

// エラークラス
export class StorageError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'StorageError';
  }
}

// パスユーティリティ関数
export class PathUtils {
  // パスを正規化（末尾にスラッシュを追加）
  static normalizePath(path: string): string {
    if (!path) return '/';
    if (path === '/') return '/';
    return path.endsWith('/') ? path : `${path}/`;
  }

  // フルパスを取得（親パス + 名前）
  static getFullPath(parentPath: string, name: string): string {
    const normalized = this.normalizePath(parentPath);
    return normalized === '/' ? `/${name}/` : `${normalized}${name}/`;
  }

  // 親パスを取得
  static getParentPath(path: string): string {
    const normalized = this.normalizePath(path);
    if (normalized === '/') return '/';
    const parts = normalized.slice(0, -1).split('/').filter(Boolean);
    parts.pop();
    return parts.length === 0 ? '/' : `/${parts.join('/')}/`;
  }

  // フォルダ名を取得
  static getFolderName(path: string): string {
    const normalized = this.normalizePath(path);
    if (normalized === '/') return '/';
    const parts = normalized.slice(0, -1).split('/').filter(Boolean);
    return parts[parts.length - 1] || '/';
  }

  // 入力パスをパース（例: "aaa/bbb/note.txt" → {folders: ["aaa", "bbb"], fileName: "note.txt"}）
  static parseInputPath(input: string): { folders: string[]; fileName: string } {
    const trimmed = input.trim();
    const parts = trimmed.split('/').filter(Boolean);

    if (parts.length === 0) {
      return { folders: [], fileName: '新しいノート' };
    }

    if (parts.length === 1) {
      return { folders: [], fileName: parts[0] };
    }

    return {
      folders: parts.slice(0, -1),
      fileName: parts[parts.length - 1],
    };
  }
}

interface UpdateNoteData {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
  path?: string;
}

export class NoteListStorage {
  // --- Private Raw Note Methods ---
  private static async getAllNotesRaw(): Promise<Note[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
      const notes = await StorageUtils.safeJsonParse<any[]>(jsonValue);
      if (!notes) return [];
      return notes.map(note => StorageUtils.convertDates(note) as Note);
    } catch {
      throw new StorageError('Failed to retrieve notes', 'FETCH_ERROR');
    }
  }

  private static async saveAllNotes(notes: Note[]): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    } catch {
      throw new StorageError('Failed to save notes', 'SAVE_ERROR');
    }
  }

  // --- Private Raw Folder Methods ---
  private static async getAllFoldersRaw(): Promise<Folder[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(FOLDERS_STORAGE_KEY);
      const folders = await StorageUtils.safeJsonParse<any[]>(jsonValue);
      if (!folders) return [];
      return folders.map(folder => StorageUtils.convertDates(folder) as Folder);
    } catch {
      throw new StorageError('Failed to retrieve folders', 'FETCH_FOLDERS_ERROR');
    }
  }

  private static async saveAllFolders(folders: Folder[]): Promise<void> {
    try {
      await AsyncStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
    } catch {
      throw new StorageError('Failed to save folders', 'SAVE_FOLDERS_ERROR');
    }
  }

  // --- Public Note Methods ---
  static async getAllNotes(): Promise<Note[]> {
    const notes = await this.getAllNotesRaw();
    return notes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  static async getNotesByPath(path: string): Promise<Note[]> {
    const notes = await this.getAllNotesRaw();
    const normalizedPath = PathUtils.normalizePath(path);
    return notes
      .filter(note => PathUtils.normalizePath(note.path) === normalizedPath)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  static async deleteNotes(noteIds: string[]): Promise<void> {
    let notes = await this.getAllNotesRaw();
    notes = notes.filter(note => !noteIds.includes(note.id));
    await this.saveAllNotes(notes);
  }

  static async copyNotes(sourceIds: string[]): Promise<Note[]> {
    const notes = await this.getAllNotesRaw();
    const copiedNotes: Note[] = [];
    const now = new Date();

    for (const id of sourceIds) {
      const noteToCopy = notes.find(note => note.id === id);
      if (noteToCopy) {
        const newNote: Note = {
          ...noteToCopy,
          id: uuidv4(),
          createdAt: now,
          updatedAt: now,
          title: `Copy of ${noteToCopy.title}`,
          version: 1,
        };
        copiedNotes.push(newNote);
      }
    }

    if (copiedNotes.length > 0) {
      await this.saveAllNotes([...notes, ...copiedNotes]);
    }
    return copiedNotes;
  }

  static async createNote(data: CreateNoteData): Promise<Note> {
    const now = new Date();
    const newNote: Note = {
      id: uuidv4(),
      title: data.title,
      content: data.content,
      tags: data.tags || [],
      path: PathUtils.normalizePath(data.path || '/'),
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    const notes = await this.getAllNotesRaw();
    notes.push(newNote);
    await this.saveAllNotes(notes);
    return newNote;
  }

  static async updateNote(data: UpdateNoteData): Promise<Note> {
    const notes = await this.getAllNotesRaw();
    const noteIndex = notes.findIndex(n => n.id === data.id);

    if (noteIndex === -1) {
      throw new StorageError(`Note with id ${data.id} not found`, 'NOT_FOUND');
    }

    const existingNote = notes[noteIndex];
    const updatedNote = {
      ...existingNote,
      ...data,
      updatedAt: new Date(),
    };
    notes[noteIndex] = updatedNote;
    await this.saveAllNotes(notes);
    return updatedNote;
  }

  static async moveNote(noteId: string, newPath: string): Promise<Note> {
    const notes = await this.getAllNotesRaw();
    const noteIndex = notes.findIndex(n => n.id === noteId);

    if (noteIndex === -1) {
      throw new StorageError(`Note with id ${noteId} not found`, 'NOT_FOUND');
    }

    notes[noteIndex].path = PathUtils.normalizePath(newPath);
    notes[noteIndex].updatedAt = new Date();
    await this.saveAllNotes(notes);
    return notes[noteIndex];
  }

  // --- Public Folder Methods ---
  static async getAllFolders(): Promise<Folder[]> {
    return await this.getAllFoldersRaw();
  }

  static async getFoldersByPath(path: string): Promise<Folder[]> {
    const folders = await this.getAllFoldersRaw();
    const normalizedPath = PathUtils.normalizePath(path);
    return folders.filter(folder => PathUtils.normalizePath(folder.path) === normalizedPath);
  }

  static async createFolder(data: CreateFolderData): Promise<Folder> {
    const now = new Date();
    const newFolder: Folder = {
      id: uuidv4(),
      name: data.name,
      path: PathUtils.normalizePath(data.path),
      createdAt: now,
      updatedAt: now,
    };

    const folders = await this.getAllFoldersRaw();
    folders.push(newFolder);
    await this.saveAllFolders(folders);
    return newFolder;
  }

  static async updateFolder(data: UpdateFolderData): Promise<Folder> {
    const folders = await this.getAllFoldersRaw();
    const folderIndex = folders.findIndex(f => f.id === data.id);

    if (folderIndex === -1) {
      throw new StorageError(`Folder with id ${data.id} not found`, 'NOT_FOUND');
    }

    const oldFolder = folders[folderIndex];
    const oldFullPath = PathUtils.getFullPath(oldFolder.path, oldFolder.name);

    if (data.name) folders[folderIndex].name = data.name;
    if (data.path) folders[folderIndex].path = PathUtils.normalizePath(data.path);
    folders[folderIndex].updatedAt = new Date();

    const newFullPath = PathUtils.getFullPath(folders[folderIndex].path, folders[folderIndex].name);

    // フォルダ名やパスが変更された場合、子要素のパスも更新
    if (oldFullPath !== newFullPath) {
      await this.updateChildrenPaths(oldFullPath, newFullPath);
    }

    await this.saveAllFolders(folders);
    return folders[folderIndex];
  }

  static async deleteFolder(folderId: string, deleteContents: boolean = false): Promise<void> {
    const folders = await this.getAllFoldersRaw();
    const folderIndex = folders.findIndex(f => f.id === folderId);

    if (folderIndex === -1) {
      throw new StorageError(`Folder with id ${folderId} not found`, 'NOT_FOUND');
    }

    const folderToDelete = folders[folderIndex];
    const folderPath = PathUtils.getFullPath(folderToDelete.path, folderToDelete.name);

    if (deleteContents) {
      // フォルダ内のすべてのノートとサブフォルダを削除
      await this.deleteItemsInPath(folderPath, true);
    } else {
      // フォルダ内にアイテムがある場合はエラー
      const itemsInFolder = await this.getItemsByPath(folderPath);
      if (itemsInFolder.length > 0) {
        throw new StorageError('Folder is not empty', 'FOLDER_NOT_EMPTY');
      }
    }

    folders.splice(folderIndex, 1);
    await this.saveAllFolders(folders);
  }

  // --- Helper Methods ---
  private static async updateChildrenPaths(oldPath: string, newPath: string): Promise<void> {
    const notes = await this.getAllNotesRaw();
    const folders = await this.getAllFoldersRaw();

    // ノートのパスを更新
    notes.forEach(note => {
      if (note.path.startsWith(oldPath)) {
        note.path = note.path.replace(oldPath, newPath);
      }
    });

    // フォルダのパスを更新
    folders.forEach(folder => {
      const fullPath = PathUtils.getFullPath(folder.path, folder.name);
      if (fullPath.startsWith(oldPath)) {
        folder.path = folder.path.replace(oldPath, newPath);
      }
    });

    await this.saveAllNotes(notes);
    await this.saveAllFolders(folders);
  }

  private static async deleteItemsInPath(path: string, recursive: boolean): Promise<void> {
    let notes = await this.getAllNotesRaw();
    let folders = await this.getAllFoldersRaw();

    if (recursive) {
      // パスで始まるすべてのアイテムを削除
      notes = notes.filter(note => !note.path.startsWith(path));
      folders = folders.filter(folder => {
        const fullPath = PathUtils.getFullPath(folder.path, folder.name);
        return !fullPath.startsWith(path);
      });
    } else {
      // 直接の子要素のみ削除
      const normalizedPath = PathUtils.normalizePath(path);
      notes = notes.filter(note => PathUtils.normalizePath(note.path) !== normalizedPath);
      folders = folders.filter(folder => PathUtils.normalizePath(folder.path) !== normalizedPath);
    }

    await this.saveAllNotes(notes);
    await this.saveAllFolders(folders);
  }

  static async getItemsByPath(path: string): Promise<FileSystemItem[]> {
    const notes = await this.getNotesByPath(path);
    const folders = await this.getFoldersByPath(path);

    const items: FileSystemItem[] = [
      ...folders.map(folder => ({ type: 'folder' as const, item: folder })),
      ...notes.map(note => ({ type: 'note' as const, item: note })),
    ];

    return items;
  }

  // --- Migration Method ---
  static async migrateExistingNotes(): Promise<void> {
    const notes = await this.getAllNotesRaw();
    let migrated = false;

    notes.forEach(note => {
      if (!note.path) {
        note.path = '/';
        migrated = true;
      }
    });

    if (migrated) {
      await this.saveAllNotes(notes);
      console.log('Migrated existing notes to new path structure');
    }
  }

  // --- Auto Folder Creation Method ---
  /**
   * 指定されたフォルダパスを自動作成（存在しないフォルダを再帰的に作成）
   * @param folderNames フォルダ名の配列（例: ["aaa", "bbb"]）
   * @param basePath ベースとなるパス（現在の位置）
   * @returns 最終的なフォルダパス
   */
  static async ensureFoldersExist(folderNames: string[], basePath: string = '/'): Promise<string> {
    if (folderNames.length === 0) {
      return PathUtils.normalizePath(basePath);
    }

    const folders = await this.getAllFoldersRaw();
    let currentPath = PathUtils.normalizePath(basePath);

    for (const folderName of folderNames) {
      const fullPath = PathUtils.getFullPath(currentPath, folderName);

      // フォルダが既に存在するかチェック
      const existingFolder = folders.find(
        f => PathUtils.getFullPath(f.path, f.name) === fullPath
      );

      if (!existingFolder) {
        // フォルダを作成
        const newFolder = await this.createFolder({
          name: folderName,
          path: currentPath,
        });
        folders.push(newFolder);
        console.log(`Created folder: ${folderName} at ${currentPath}`);
      }

      currentPath = fullPath;
    }

    return currentPath;
  }

  /**
   * パス入力からノートを作成（フォルダを自動作成）
   * @param inputPath ユーザー入力（例: "aaa/bbb/note.txt"）
   * @param basePath 現在のパス
   * @returns 作成されたノート
   */
  static async createNoteWithPath(inputPath: string, basePath: string = '/'): Promise<Note> {
    const { folders, fileName } = PathUtils.parseInputPath(inputPath);

    // フォルダを自動作成
    const targetPath = await this.ensureFoldersExist(folders, basePath);

    // ノートを作成
    return await this.createNote({
      title: fileName,
      content: '',
      path: targetPath,
    });
  }
}
