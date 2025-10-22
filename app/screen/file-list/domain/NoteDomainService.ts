/**
 * @file NoteDomainService.ts
 * @summary ノートに関するビジネスロジック層
 * @description
 * ノートのバリデーション、重複チェック、ビジネスルールの実装を担当します。
 * データアクセスはRepositoryを通じて行います。
 */

import { File } from '@shared/types/file';
import { NoteRepository } from '../infrastructure/NoteRepository';

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
export class NoteDomainService {
  /**
   * ノート名のバリデーション
   * @param name ノート名
   * @returns バリデーション結果
   */
  static validateNoteName(name: string): ValidationResult {
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
   * ノートの重複チェック
   * @param title ノートタイトル
   * @param folderPath フォルダパス
   * @param excludeId 除外するノートID（更新時に使用）
   * @returns 重複チェック結果
   */
  static async checkDuplicate(
    title: string,
    folderPath: string,
    excludeId?: string
  ): Promise<DuplicateCheckResult> {
    const allNotes = await NoteRepository.getAll();
    const existing = allNotes.find(
      note =>
        note.title === title &&
        note.path === folderPath &&
        note.id !== excludeId
    );

    return {
      isDuplicate: !!existing,
      existing,
    };
  }

  /**
   * ノートの移動操作をバリデーション
   * @param noteIds 移動するノートIDの配列
   * @param targetFolderPath 移動先フォルダパス
   * @returns バリデーション結果
   */
  static async validateMoveOperation(
    noteIds: string[],
    targetFolderPath: string
  ): Promise<MoveValidationResult> {
    const allNotes = await NoteRepository.getAll();
    const errors: string[] = [];

    for (const noteId of noteIds) {
      const note = allNotes.find(n => n.id === noteId);
      if (!note) {
        errors.push(`ノート ${noteId} が見つかりません`);
        continue;
      }

      // 移動先が同じ場合はスキップ
      if (note.path === targetFolderPath) {
        continue;
      }

      // 重複チェック
      const { isDuplicate } = await this.checkDuplicate(
        note.title,
        targetFolderPath,
        noteId
      );

      if (isDuplicate) {
        errors.push(`"${note.title}" は移動先に既に存在します`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * ノートのコピー操作をバリデーション
   * @param noteIds コピーするノートIDの配列
   * @returns バリデーション結果
   */
  static async validateCopyOperation(noteIds: string[]): Promise<MoveValidationResult> {
    const allNotes = await NoteRepository.getAll();
    const errors: string[] = [];

    for (const noteId of noteIds) {
      const note = allNotes.find(n => n.id === noteId);
      if (!note) {
        errors.push(`ノート ${noteId} が見つかりません`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * ノートのタイトルと内容が有効かチェック
   * @param title タイトル
   * @param content 内容
   * @returns バリデーション結果
   */
  static validateNoteContent(title: string, content: string): ValidationResult {
    const titleValidation = this.validateNoteName(title);
    if (!titleValidation.valid) {
      return titleValidation;
    }

    // 内容の長さチェック（必要に応じて）
    const MAX_CONTENT_LENGTH = 1000000; // 1MB相当
    if (content.length > MAX_CONTENT_LENGTH) {
      return {
        valid: false,
        error: `ノートの内容が大きすぎます（最大${MAX_CONTENT_LENGTH}文字）`,
      };
    }

    return { valid: true };
  }

  /**
   * 指定パス内のノートを全て取得（再帰的）
   * @param folderPath フォルダパス
   * @param allNotes 全ノートの配列
   * @returns パス内の全ノート
   */
  static getNotesInPath(folderPath: string, allNotes: File[]): File[] {
    return allNotes.filter(note => note.path.startsWith(folderPath));
  }
}
