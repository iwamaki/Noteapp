/**
 * @file NoteDomainService.ts
 * @summary ノートに関するビジネスロジック層
 * @description
 * ファイルのバリデーション、重複チェック、ビジネスルールの実装を担当します。
 * データアクセスはRepositoryを通じて行います。
 */

import { File } from '@shared/types/file';
import { FileRepository } from '../infrastructure/FileRepository';

/**
 * バリデーション結果の型
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 重複チェック結果の型
 */
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existing?: File;
}

/**
 * 移動操作バリデーション結果の型
 */
export interface MoveValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * ノートドメインサービス
 * ノートに関するビジネスロジックを集約
 */
export class FileDomainService {
  /**
   * ノート名のバリデーション
   * @param name ノート名
   * @returns バリデーション結果
   */
  static validateFileName(name: string): ValidationResult {
    if (!name || !name.trim()) {
      return { valid: false, error: 'ノート名を入力してください' };
    }

    const trimmedName = name.trim();

    if (trimmedName.length > 100) {
      return { valid: false, error: 'ノート名は100文字以内にしてください' };
    }

    // 特殊文字のチェック（必要に応じて）
    const invalidChars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];
    const hasInvalidChar = invalidChars.some(char => trimmedName.includes(char));
    if (hasInvalidChar) {
      return {
        valid: false,
        error: `ノート名に次の文字は使用できません: ${invalidChars.join(' ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * ファイルの重複チェック
   * @param title ノートタイトル
   * @param folderPath フォルダパス
   * @param excludeId 除外するファイルID（更新時に使用）
   * @returns 重複チェック結果
   */
  static async checkDuplicate(
    title: string,
    folderPath: string,
    excludeId?: string
  ): Promise<DuplicateCheckResult> {
    const allFiles = await FileRepository.getAll();
    const existing = allFiles.find(
      file =>
        file.title === title &&
        file.path === folderPath &&
        file.id !== excludeId
    );

    return {
      isDuplicate: !!existing,
      existing,
    };
  }

  /**
   * ファイルの移動操作をバリデーション
   * @param fileIds 移動するファイルIDの配列
   * @param targetFolderPath 移動先フォルダパス
   * @returns バリデーション結果
   */
  static async validateMoveOperation(
    fileIds: string[],
    targetFolderPath: string
  ): Promise<MoveValidationResult> {
    const allFiles = await FileRepository.getAll();
    const errors: string[] = [];

    for (const fileId of fileIds) {
      const file = allFiles.find(f => f.id === fileId);
      if (!file) {
        errors.push(`ファイル ${fileId} が見つかりません`);
        continue;
      }

      // 移動先が同じ場合はスキップ
      if (file.path === targetFolderPath) {
        continue;
      }

      // 重複チェック
      const { isDuplicate } = await this.checkDuplicate(
        file.title,
        targetFolderPath,
        fileId
      );

      if (isDuplicate) {
        errors.push(`"${file.title}" は移動先に既に存在します`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * ファイルのコピー操作をバリデーション
   * @param fileIds コピーするファイルIDの配列
   * @returns バリデーション結果
   */
  static async validateCopyOperation(fileIds: string[]): Promise<MoveValidationResult> {
    const allFiles = await FileRepository.getAll();
    const errors: string[] = [];

    for (const fileId of fileIds) {
      const file = allFiles.find(f => f.id === fileId);
      if (!file) {
        errors.push(`ファイル ${fileId} が見つかりません`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * ファイルのタイトルと内容が有効かチェック
   * @param title タイトル
   * @param content 内容
   * @returns バリデーション結果
   */
  static validateNoteContent(title: string, content: string): ValidationResult {
    const titleValidation = this.validateFileName(title);
    if (!titleValidation.valid) {
      return titleValidation;
    }

    // 内容の長さチェック（必要に応じて）
    const MAX_CONTENT_LENGTH = 1000000; // 1MB相当
    if (content.length > MAX_CONTENT_LENGTH) {
      return {
        valid: false,
        error: `ファイルの内容が大きすぎます（最大${MAX_CONTENT_LENGTH}文字）`,
      };
    }

    return { valid: true };
  }

  /**
   * 指定パス内のファイルを全て取得（再帰的）
   * @param folderPath フォルダパス
   * @param allFiles 全ファイルの配列
   * @returns パス内の全ファイル
   */
  static getFilesInPath(folderPath: string, allFiles: File[]): File[] {
    return allFiles.filter(file => file.path.startsWith(folderPath));
  }
}
