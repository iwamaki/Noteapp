/**
 * @file services/FileService.ts
 * @summary ノート編集のビジネスロジック層
 * @description データアクセス層とバリデーションを組み合わせたビジネスロジック
 */

// import { FileRepositoryV2 } from '@data/repositories/fileRepositoryV2';
import { FileRepository } from '@data/repositories/fileRepository';
import { ValidationService } from './ValidationService';
import { ErrorService } from './ErrorService';
import { FileFlat, ErrorCode, EditorError } from '../types';

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
  async loadFile(id: string): Promise<FileFlat> {
    try {
      const file = await FileRepository.getById(id);

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
  async save(data: Partial<FileFlat & { id?: string }>): Promise<FileFlat> {
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
        const file = await FileRepository.update(data.id, {
          title: data.title,
          content: data.content,
          tags: data.tags,
          summary: data.summary,
        });
        return file;
      } else {
        // 新規ファイルの作成（フラット構造なのでパス不要）
        const file = await FileRepository.create({
          title: data.title || '',
          content: data.content || '',
          tags: data.tags || [],
          summary: data.summary,
        });
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
      await FileRepository.delete(id);
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
}

/**
 * デフォルトのサービスインスタンスを作成
 */
const validator = new ValidationService();
const errorService = ErrorService.getInstance();

export const fileService = new FileService(validator, errorService);
