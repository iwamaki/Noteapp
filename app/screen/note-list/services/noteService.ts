// app/screen/note-list/services/noteService.ts
import { NoteListStorage } from '../noteStorage';
import { PathUtils } from '../utils/pathUtils';
import { Note, Folder } from '@shared/types/note';

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
 */
export class NoteService {
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

      const sourcePath = PathUtils.getFullPath(folderToMove.path, folderToMove.name, 'folder');

      // フォルダを自分自身やその子孫に移動させない
      if (destinationPath.startsWith(sourcePath)) {
        return {
          valid: false,
          error: 'フォルダを自身または子孫フォルダに移動できません',
        };
      }

      // 移動先に同名のフォルダが存在しないかチェック
      const destinationFolders = allFolders.filter(
        f => PathUtils.normalizePath(f.path) === destinationPath
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
   * パスを指定してノートを作成
   */
  static async createNoteWithPath(
    inputPath: string,
    basePath: string = '/'
  ): Promise<Note> {
    return await NoteListStorage.createNoteWithPath(inputPath, basePath);
  }
}
