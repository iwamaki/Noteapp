/**
 * @file services/NoteService.ts
 * @summary ノート編集のビジネスロジック層
 * @description データアクセス層とバリデーションを組み合わせたビジネスロジック
 */

import { FileRepository } from '../repositories/FileRepository';
import { AsyncStorageFileRepository } from '../repositories/AsyncStorageFileRepository';
import { ValidationService } from './ValidationService';
import { ErrorService } from './ErrorService';
import { File, ErrorCode, EditorError } from '../types';
import { CreateFileData, UpdateFileData } from '@shared/types/file';

/**
 * ノートサービス
 * ビジネスロジックを管理し、リポジトリとバリデーションを組み合わせる
 */
export class FileService {
  constructor(
    private repository: FileRepository,
    private validator: ValidationService,
    private errorService: ErrorService
  ) {}

  /**
   * ファイルを読み込む
   */
  async loadFile(id: string): Promise<File> {
    try {
      const file = await this.repository.findById(id);

      if (!file) {
        const error: EditorError = {
          code: ErrorCode.NOT_FOUND,
          message: `ファイル(ID: ${id})が見つかりませんでした。`,
          recoverable: false,
        };
        throw error;
      }

      return file;
    } catch (error) {
      // EditorErrorの場合はそのまま再スロー
      if ((error as EditorError).code) {
        throw error;
      }

      // それ以外のエラーの場合はEditorErrorに変換
      const editorError: EditorError = {
        code: ErrorCode.LOAD_FAILED,
        message: 'ファイルの読み込みに失敗しました。',
        recoverable: true,
        retry: () => this.loadFile(id),
      };
      throw editorError;
    }
  }

  /**
   * ファイルを保存（新規作成または更新）
   */
  async save(data: Partial<File & { id?: string }>): Promise<File> {
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
        // 既存ファイルの更新
        return await this.repository.update(data.id, data as Partial<UpdateFileData>);
      } else {
        // 新規ファイルの作成
        return await this.repository.create(data as CreateFileData);
      }
    } catch {
      const editorError: EditorError = {
        code: ErrorCode.SAVE_FAILED,
        message: 'ファイルの保存に失敗しました。',
        recoverable: true,
        retry: () => this.save(data),
      };
      throw editorError;
    }
  }

  /**
   * ファイルを削除
   */
  async deleteFile(id: string): Promise<void> {
    try {
      await this.repository.delete(id);
    } catch {
      const editorError: EditorError = {
        code: ErrorCode.STORAGE_ERROR,
        message: 'ファイルの削除に失敗しました。',
        recoverable: true,
        retry: () => this.deleteFile(id),
      };
      throw editorError;
    }
  }

  /**
   * ファイルのバージョン履歴を取得
   */
  async getVersionHistory(fileId: string) {
    try {
      return await this.repository.getVersions(fileId);
    } catch {
      const editorError: EditorError = {
        code: ErrorCode.STORAGE_ERROR,
        message: 'バージョン履歴の取得に失敗しました。',
        recoverable: true,
        retry: () => this.getVersionHistory(fileId),
      };
      throw editorError;
    }
  }

  /**
   * ファイルを特定のバージョンに復元
   */
  async restoreVersion(fileId: string, versionId: string): Promise<File> {
    try {
      return await this.repository.restoreVersion(fileId, versionId);
    } catch {
      const editorError: EditorError = {
        code: ErrorCode.STORAGE_ERROR,
        message: 'バージョンの復元に失敗しました。',
        recoverable: true,
        retry: () => this.restoreVersion(fileId, versionId),
      };
      throw editorError;
    }
  }
}

/**
 * デフォルトのサービスインスタンスを作成
 */
const repository = new AsyncStorageFileRepository();
const validator = new ValidationService();
const errorService = ErrorService.getInstance();

export const fileService = new FileService(repository, validator, errorService);
