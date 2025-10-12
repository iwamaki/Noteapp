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

import { PathUtils } from './utils/pathUtils';

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
    const allFolders = await this.getAllFoldersRaw();
    const folderIndex = allFolders.findIndex(f => f.id === data.id);

    if (folderIndex === -1) {
      throw new StorageError(`Folder with id ${data.id} not found`, 'NOT_FOUND');
    }

    const folderToUpdate = allFolders[folderIndex];
    const oldFullPath = PathUtils.getFullPath(folderToUpdate.path, folderToUpdate.name);

    // 変更を適用
    const newName = data.name ?? folderToUpdate.name;
    const newPath = data.path ? PathUtils.normalizePath(data.path) : folderToUpdate.path;
    const newFullPath = PathUtils.getFullPath(newPath, newName);

    // 変更がない場合は何もしない
    if (oldFullPath === newFullPath && folderToUpdate.name === newName && folderToUpdate.path === newPath) {
      return folderToUpdate;
    }
    
    folderToUpdate.name = newName;
    folderToUpdate.path = newPath;
    folderToUpdate.updatedAt = new Date();

    // 子孫のパスを更新する必要があるかチェック
    if (oldFullPath !== newFullPath) {
      const allNotes = await this.getAllNotesRaw();

      // 子ノートのパスを更新
      allNotes.forEach(note => {
        if (note.path === oldFullPath) {
          note.path = newFullPath;
        } else if (note.path.startsWith(oldFullPath + '/')) {
          note.path = newFullPath + note.path.substring(oldFullPath.length);
        }
      });

      // 子フォルダのパスを更新
      allFolders.forEach(folder => {
        // 自分自身は既に更新済みなのでスキップ
        if (folder.id === data.id) return;

        if (folder.path === oldFullPath) {
          folder.path = newFullPath;
        } else if (folder.path.startsWith(oldFullPath + '/')) {
          folder.path = newFullPath + folder.path.substring(oldFullPath.length);
        }
      });
      
      await this.saveAllNotes(allNotes);
    }

    await this.saveAllFolders(allFolders);
    return folderToUpdate;
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
