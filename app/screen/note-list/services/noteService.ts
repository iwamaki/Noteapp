// app/screen/note-list/services/noteService.ts
import { NoteListStorage } from '../noteStorage';
import { PathService } from '../../../services/PathService';
import { Note, Folder } from '@shared/types/note';
import { StorageError, saveAllNotes, saveAllFolders } from '../noteStorage/storage';

export interface MoveOperation {
  noteIds: string[];
  folderIds: string[];
  destinationPath: string;
}

export interface BatchDeleteOperation {
  noteIds: string[];
  folderIds: string[];
}

/**
 * ビジネスロジック層
 * ストレージ操作を抽象化し、複雑なビジネスルールを管理
 * パス管理とバリデーションの責務を持つ
 */
export class NoteService {
  /**
   * ノートの重複チェック
   * 同じパス内に同じタイトルのノートが存在するかチェック
   */
  static async checkNoteDuplicate(
    path: string,
    title: string,
    excludeId?: string
  ): Promise<boolean> {
    const allNotes = await NoteListStorage.getAllNotes();
    const normalizedPath = PathService.normalizePath(path);

    return allNotes.some(
      note =>
        note.id !== excludeId &&
        PathService.normalizePath(note.path) === normalizedPath &&
        note.title === title
    );
  }

  /**
   * フォルダの重複チェック
   * 同じパス内に同じ名前のフォルダが存在するかチェック
   */
  static async checkFolderDuplicate(
    path: string,
    name: string,
    excludeId?: string
  ): Promise<boolean> {
    const allFolders = await NoteListStorage.getAllFolders();
    const normalizedPath = PathService.normalizePath(path);

    return allFolders.some(
      folder =>
        folder.id !== excludeId &&
        PathService.normalizePath(folder.path) === normalizedPath &&
        folder.name === name
    );
  }

  /**
   * フォルダ移動時に子要素のパスを更新
   * フォルダのパスが変更された場合、その配下の全ノート・フォルダのパスも更新する
   */
  static async updateChildrenPaths(
    oldFullPath: string,
    newFullPath: string
  ): Promise<void> {
    if (oldFullPath === newFullPath) {
      return;
    }

    const allNotes = await NoteListStorage.getAllNotes();
    const allFolders = await NoteListStorage.getAllFolders();

    // Update all notes whose path starts with oldFullPath
    const updatedNotes = allNotes.map(note => {
      if (note.path === oldFullPath) {
        return { ...note, path: newFullPath };
      } else if (note.path.startsWith(oldFullPath)) {
        // Since oldFullPath already ends with '/', we don't need to add another '/'
        return { ...note, path: newFullPath + note.path.substring(oldFullPath.length) };
      }
      return note;
    });

    // Update all child folders whose path starts with oldFullPath
    const updatedFolders = allFolders.map(folder => {
      if (folder.path === oldFullPath) {
        return { ...folder, path: newFullPath };
      } else if (folder.path.startsWith(oldFullPath)) {
        // Since oldFullPath already ends with '/', we don't need to add another '/'
        return { ...folder, path: newFullPath + folder.path.substring(oldFullPath.length) };
      }
      return folder;
    });

    // Save updated data
    await saveAllNotes(updatedNotes);
    await saveAllFolders(updatedFolders);
  }

  /**
   * 複数のアイテムを削除（トランザクション的に処理）
   */
  static async batchDelete(operation: BatchDeleteOperation): Promise<void> {
    const { noteIds, folderIds } = operation;

    // ノートを削除
    if (noteIds.length > 0) {
      await NoteListStorage.deleteNotes(noteIds);
    }

    // フォルダを削除（コンテンツも含む）
    for (const folderId of folderIds) {
      await NoteListStorage.deleteFolder(folderId, true);
    }
  }

  /**
   * 移動操作のバリデーション
   */
  static async validateMoveOperation(
    operation: MoveOperation
  ): Promise<{ valid: boolean; error?: string }> {
    const { folderIds, destinationPath } = operation;

    if (folderIds.length === 0) {
      return { valid: true };
    }

    const allFolders = await NoteListStorage.getAllFolders();

    for (const folderId of folderIds) {
      const folderToMove = allFolders.find(f => f.id === folderId);
      
      if (!folderToMove) {
        return { valid: false, error: `フォルダ ${folderId} が見つかりません` };
      }

      const sourcePath = PathService.getFullPath(folderToMove.path, folderToMove.name, 'folder');

      // フォルダを自分自身やその子孫に移動させない
      if (destinationPath.startsWith(sourcePath)) {
        return {
          valid: false,
          error: 'フォルダを自身または子孫フォルダに移動できません',
        };
      }

      // 移動先に同名のフォルダが存在しないかチェック
      const destinationFolders = allFolders.filter(
        f => PathService.normalizePath(f.path) === destinationPath
      );
      
      if (destinationFolders.some(f => f.name === folderToMove.name)) {
        return {
          valid: false,
          error: `移動先に同名のフォルダ "${folderToMove.name}" が既に存在します`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * 複数のアイテムを移動
   */
  static async batchMove(operation: MoveOperation): Promise<void> {
    const validation = await this.validateMoveOperation(operation);
    
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const { noteIds, folderIds, destinationPath } = operation;

    // ノートを移動
    for (const noteId of noteIds) {
      await NoteListStorage.moveNote(noteId, destinationPath);
    }

    // フォルダを移動
    for (const folderId of folderIds) {
      await NoteListStorage.updateFolder({
        id: folderId,
        path: destinationPath,
      });
    }
  }

  /**
   * ノートを複製
   */
  static async copyNotes(noteIds: string[]): Promise<Note[]> {
    if (noteIds.length === 0) {
      return [];
    }
    return await NoteListStorage.copyNotes(noteIds);
  }

  /**
   * アイテムの名前を変更
   */
  static async renameItem(
    id: string,
    type: 'note' | 'folder',
    newName: string
  ): Promise<Note | Folder> {
    if (type === 'folder') {
      return await NoteListStorage.updateFolder({ id, name: newName });
    } else {
      return await NoteListStorage.updateNote({ id, title: newName });
    }
  }

  /**
   * フォルダを再帰的に作成
   * パス内に存在しないフォルダがあれば順次作成する
   */
  static async ensureFoldersExist(
    folderNames: string[],
    basePath: string = '/'
  ): Promise<string> {
    if (folderNames.length === 0) {
      return PathService.normalizePath(basePath);
    }

    const folders = await NoteListStorage.getAllFolders();
    let currentPath = PathService.normalizePath(basePath);

    for (const folderName of folderNames) {
      const fullPath = PathService.getFullPath(currentPath, folderName, 'folder');

      const existingFolder = folders.find(
        f => PathService.getFullPath(f.path, f.name, 'folder') === fullPath
      );

      if (!existingFolder) {
        const newFolder = await NoteListStorage.createFolder({
          name: folderName,
          path: currentPath,
        });
        folders.push(newFolder);
      }

      currentPath = fullPath;
    }

    return currentPath;
  }

  /**
   * ノートを作成（重複チェック付き）
   */
  static async createNote(data: {
    title: string;
    content: string;
    path: string;
    tags?: string[];
  }): Promise<Note> {
    const normalizedPath = PathService.normalizePath(data.path || '/');

    // 重複チェック
    const isDuplicate = await this.checkNoteDuplicate(normalizedPath, data.title);
    if (isDuplicate) {
      throw new StorageError(
        `A note with title "${data.title}" already exists in path "${normalizedPath}"`,
        'DUPLICATE_ITEM'
      );
    }

    return await NoteListStorage.createNote({
      ...data,
      path: normalizedPath,
    });
  }

  /**
   * ノートを更新（重複チェック付き）
   */
  static async updateNote(data: {
    id: string;
    title?: string;
    content?: string;
    tags?: string[];
    path?: string;
  }): Promise<Note> {
    const allNotes = await NoteListStorage.getAllNotes();
    const existingNote = allNotes.find(n => n.id === data.id);

    if (!existingNote) {
      throw new StorageError(`Note with id ${data.id} not found`, 'NOT_FOUND');
    }

    const newTitle = data.title ?? existingNote.title;
    const newPath = data.path ? PathService.normalizePath(data.path) : existingNote.path;

    // 重複チェック（自分自身を除く）
    const isDuplicate = await this.checkNoteDuplicate(newPath, newTitle, data.id);
    if (isDuplicate) {
      throw new StorageError(
        `A note with title "${newTitle}" already exists in path "${newPath}"`,
        'DUPLICATE_ITEM'
      );
    }

    return await NoteListStorage.updateNote(data);
  }

  /**
   * ノートを移動（重複チェック付き）
   */
  static async moveNote(noteId: string, newPath: string): Promise<Note> {
    const allNotes = await NoteListStorage.getAllNotes();
    const note = allNotes.find(n => n.id === noteId);

    if (!note) {
      throw new StorageError(`Note with id ${noteId} not found`, 'NOT_FOUND');
    }

    const normalizedNewPath = PathService.normalizePath(newPath);

    // 重複チェック
    const isDuplicate = await this.checkNoteDuplicate(normalizedNewPath, note.title, noteId);
    if (isDuplicate) {
      throw new StorageError(
        `A note with title "${note.title}" already exists in path "${normalizedNewPath}"`,
        'DUPLICATE_ITEM'
      );
    }

    return await NoteListStorage.moveNote(noteId, normalizedNewPath);
  }

  /**
   * フォルダを作成（重複チェック付き）
   */
  static async createFolder(data: { name: string; path: string }): Promise<Folder> {
    const normalizedPath = PathService.normalizePath(data.path);

    // 重複チェック
    const isDuplicate = await this.checkFolderDuplicate(normalizedPath, data.name);
    if (isDuplicate) {
      throw new StorageError(
        `A folder with name "${data.name}" already exists in path "${normalizedPath}"`,
        'DUPLICATE_ITEM'
      );
    }

    return await NoteListStorage.createFolder({
      name: data.name,
      path: normalizedPath,
    });
  }

  /**
   * フォルダを更新（重複チェック + 子要素パス更新付き）
   */
  static async updateFolder(data: {
    id: string;
    name?: string;
    path?: string;
  }): Promise<Folder> {
    const allFolders = await NoteListStorage.getAllFolders();
    const folderToUpdate = allFolders.find(f => f.id === data.id);

    if (!folderToUpdate) {
      throw new StorageError(`Folder with id ${data.id} not found`, 'NOT_FOUND');
    }

    const oldFullPath = PathService.getFullPath(folderToUpdate.path, folderToUpdate.name, 'folder');

    const newName = data.name ?? folderToUpdate.name;
    const newPath = data.path ? PathService.normalizePath(data.path) : folderToUpdate.path;
    const newFullPath = PathService.getFullPath(newPath, newName, 'folder');

    // 変更がない場合は何もしない
    if (oldFullPath === newFullPath && folderToUpdate.name === newName && folderToUpdate.path === newPath) {
      return folderToUpdate;
    }

    // 重複チェック（自分自身を除く）
    const isDuplicate = await this.checkFolderDuplicate(newPath, newName, data.id);
    if (isDuplicate) {
      throw new StorageError(
        `A folder with name "${newName}" already exists in path "${newPath}"`,
        'DUPLICATE_ITEM'
      );
    }

    // 親フォルダと子要素を一度に更新（データの不一致を防ぐため）
    const allNotes = await NoteListStorage.getAllNotes();

    // 子ノートのパスを更新
    const updatedNotes = allNotes.map(note => {
      if (note.path === oldFullPath) {
        return { ...note, path: newFullPath };
      } else if (note.path.startsWith(oldFullPath)) {
        return { ...note, path: newFullPath + note.path.substring(oldFullPath.length) };
      }
      return note;
    });

    // 子フォルダのパスを更新 + 親フォルダ自身を更新
    const updatedFolders = allFolders.map(folder => {
      // 親フォルダ自身を更新
      if (folder.id === data.id) {
        return {
          ...folder,
          name: newName,
          path: newPath,
          updatedAt: new Date(),
        };
      }
      // 子フォルダのパスを更新
      if (folder.path === oldFullPath) {
        return { ...folder, path: newFullPath };
      } else if (folder.path.startsWith(oldFullPath)) {
        return { ...folder, path: newFullPath + folder.path.substring(oldFullPath.length) };
      }
      return folder;
    });

    // 一度に保存（トランザクション的に処理）
    await saveAllNotes(updatedNotes);
    await saveAllFolders(updatedFolders);

    return updatedFolders.find(f => f.id === data.id)!;
  }

  /**
   * パスを指定してノートを作成
   * パス内のフォルダが存在しなければ自動的に作成する
   */
  static async createNoteWithPath(
    inputPath: string,
    basePath: string = '/'
  ): Promise<Note> {
    const { folders, fileName } = PathService.parseInputPath(inputPath);
    const targetPath = await this.ensureFoldersExist(folders, basePath);

    return await this.createNote({
      title: fileName,
      content: '',
      path: targetPath,
    });
  }
}
