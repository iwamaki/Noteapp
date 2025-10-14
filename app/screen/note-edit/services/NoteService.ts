/**
 * @file services/NoteService.ts
 * @summary ノート編集のビジネスロジック層
 * @description データアクセス層とバリデーションを組み合わせたビジネスロジック
 */

import { NoteRepository } from '../repositories/NoteRepository';
import { AsyncStorageNoteRepository } from '../repositories/AsyncStorageNoteRepository';
import { ValidationService } from './ValidationService';
import { ErrorService } from './ErrorService';
import { Note, ErrorCode, EditorError } from '../types';
import { CreateNoteData, UpdateNoteData } from '@shared/types/note';

/**
 * ノートサービス
 * ビジネスロジックを管理し、リポジトリとバリデーションを組み合わせる
 */
export class NoteService {
  constructor(
    private repository: NoteRepository,
    private validator: ValidationService,
    private errorService: ErrorService
  ) {}

  /**
   * ノートを読み込む
   */
  async loadNote(id: string): Promise<Note> {
    try {
      const note = await this.repository.findById(id);

      if (!note) {
        const error: EditorError = {
          code: ErrorCode.NOT_FOUND,
          message: `ノート(ID: ${id})が見つかりませんでした。`,
          recoverable: false,
        };
        throw error;
      }

      return note;
    } catch (error) {
      // EditorErrorの場合はそのまま再スロー
      if ((error as EditorError).code) {
        throw error;
      }

      // それ以外のエラーの場合はEditorErrorに変換
      const editorError: EditorError = {
        code: ErrorCode.LOAD_FAILED,
        message: 'ノートの読み込みに失敗しました。',
        recoverable: true,
        retry: () => this.loadNote(id),
      };
      throw editorError;
    }
  }

  /**
   * ノートを保存（新規作成または更新）
   */
  async save(data: Partial<Note & { id?: string }>): Promise<Note> {
    // バリデーション
    const validationResult = this.validator.validateNote(data);
    if (!validationResult.isValid) {
      const error: EditorError = {
        code: ErrorCode.VALIDATION_ERROR,
        message: validationResult.errors.join('\n'),
        recoverable: false,
      };
      throw error;
    }

    try {
      if (data.id) {
        // 既存ノートの更新
        return await this.repository.update(data.id, data as Partial<UpdateNoteData>);
      } else {
        // 新規ノートの作成
        return await this.repository.create(data as CreateNoteData);
      }
    } catch {
      const editorError: EditorError = {
        code: ErrorCode.SAVE_FAILED,
        message: 'ノートの保存に失敗しました。',
        recoverable: true,
        retry: () => this.save(data),
      };
      throw editorError;
    }
  }

  /**
   * ノートを削除
   */
  async deleteNote(id: string): Promise<void> {
    try {
      await this.repository.delete(id);
    } catch {
      const editorError: EditorError = {
        code: ErrorCode.STORAGE_ERROR,
        message: 'ノートの削除に失敗しました。',
        recoverable: true,
        retry: () => this.deleteNote(id),
      };
      throw editorError;
    }
  }

  /**
   * ノートのバージョン履歴を取得
   */
  async getVersionHistory(noteId: string) {
    try {
      return await this.repository.getVersions(noteId);
    } catch {
      const editorError: EditorError = {
        code: ErrorCode.STORAGE_ERROR,
        message: 'バージョン履歴の取得に失敗しました。',
        recoverable: true,
        retry: () => this.getVersionHistory(noteId),
      };
      throw editorError;
    }
  }

  /**
   * ノートを特定のバージョンに復元
   */
  async restoreVersion(noteId: string, versionId: string): Promise<Note> {
    try {
      return await this.repository.restoreVersion(noteId, versionId);
    } catch {
      const editorError: EditorError = {
        code: ErrorCode.STORAGE_ERROR,
        message: 'バージョンの復元に失敗しました。',
        recoverable: true,
        retry: () => this.restoreVersion(noteId, versionId),
      };
      throw editorError;
    }
  }
}

/**
 * デフォルトのサービスインスタンスを作成
 */
const repository = new AsyncStorageNoteRepository();
const validator = new ValidationService();
const errorService = ErrorService.getInstance();

export const noteService = new NoteService(repository, validator, errorService);
