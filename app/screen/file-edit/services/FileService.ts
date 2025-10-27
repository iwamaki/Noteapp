/**
 * @file services/FileService.ts
 * @summary ノート編集のビジネスロジック層
 * @description データアクセス層とバリデーションを組み合わせたビジネスロジック
 */

import { FileRepositoryV2 } from '@data/repositories/fileRepositoryV2';
import { ValidationService } from './ValidationService';
import { ErrorService } from './ErrorService';
import { File, ErrorCode, EditorError } from '../types';

/**
 * ノートサービス
 * ビジネスロジックを管理し、リポジトリとバリデーションを組み合わせる
 */
export class FileService {
  constructor(
    private validator: ValidationService,
    private errorService: ErrorService
  ) {}

  /**
   * ファイルを読み込む
   */
  async loadFile(id: string): Promise<File> {
    try {
      const file = await FileRepositoryV2.getById(id);

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
   * ファイルを保存（新規作成または更新）（V2）
   */
  async save(data: Partial<File & { id?: string }>): Promise<File> {
    // バリデーション
    const validationResult = this.validator.validateFile(data);
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
        const file = await FileRepositoryV2.updateWithVersion(data.id, {
          title: data.title,
          content: data.content,
          tags: data.tags,
        });
        return file;
      } else {
        // 新規ファイルの作成
        // TODO: 親フォルダパスを引数として受け取る必要がある
        const folderPath = '/'; // デフォルトはルート
        const file = await FileRepositoryV2.createWithVersion(
          {
            title: data.title || '',
            content: data.content || '',
            tags: data.tags || [],
          },
          folderPath
        );
        return file;
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
   * ファイルを削除（V2）
   */
  async deleteFile(id: string): Promise<void> {
    try {
      await FileRepositoryV2.delete(id);
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
   * ファイルのバージョン履歴を取得（V2）
   */
  async getVersionHistory(fileId: string) {
    try {
      return await FileRepositoryV2.getVersions(fileId);
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
      const file = await FileRepositoryV2.restoreVersion(fileId, versionId);
      return file;
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
const validator = new ValidationService();
const errorService = ErrorService.getInstance();

export const fileService = new FileService(validator, errorService);
