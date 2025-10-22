/**
 * @file FolderDomainService.ts
 * @summary フォルダに関するビジネスロジック層
 * @description
 * フォルダのバリデーション、階層管理、子要素取得などのビジネスルールを実装します。
 * データアクセスはRepositoryを通じて行います。
 */

import { Folder, File } from '@shared/types/file';
import { FolderRepository } from '../infrastructure/FolderRepository';
import { PathService } from '../../../services/PathService';

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
  existing?: Folder;
}

/**
 * フォルダドメインサービス
 * フォルダに関するビジネスロジックを集約
 */
export class FolderDomainService {
  /**
   * フォルダ名のバリデーション
   * @param name フォルダ名
   * @returns バリデーション結果
   */
  static validateFolderName(name: string): ValidationResult {
    if (!name || !name.trim()) {
      return { valid: false, error: 'フォルダ名を入力してください' };
    }

    const trimmedName = name.trim();

    if (trimmedName.includes('/')) {
      return { valid: false, error: 'フォルダ名に "/" は使用できません' };
    }

    if (trimmedName.length > 50) {
      return { valid: false, error: 'フォルダ名は50文字以内にしてください' };
    }

    // 特殊文字のチェック
    const invalidChars = ['\\', ':', '*', '?', '"', '<', '>', '|'];
    const hasInvalidChar = invalidChars.some(char => trimmedName.includes(char));
    if (hasInvalidChar) {
      return {
        valid: false,
        error: `フォルダ名に次の文字は使用できません: ${invalidChars.join(' ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * フォルダの重複チェック
   * @param name フォルダ名
   * @param parentPath 親フォルダパス
   * @param excludeId 除外するフォルダID（更新時に使用）
   * @returns 重複チェック結果
   */
  static async checkDuplicate(
    name: string,
    parentPath: string,
    excludeId?: string
  ): Promise<DuplicateCheckResult> {
    const allFolders = await FolderRepository.getAll();
    const targetPath = PathService.getFullPath(parentPath, name, 'folder');

    const existing = allFolders.find(folder => {
      const folderFullPath = PathService.getFullPath(folder.path, folder.name, 'folder');
      return folderFullPath === targetPath && folder.id !== excludeId;
    });

    return {
      isDuplicate: !!existing,
      existing,
    };
  }

  /**
   * 直接の子フォルダを取得
   * @param parentFolderPath 親フォルダパス
   * @param allFolders 全フォルダの配列
   * @returns 子フォルダの配列
   */
  static getChildFolders(
    parentFolderPath: string,
    allFolders: Folder[]
  ): Folder[] {
    const normalizedParentPath = PathService.normalizePath(parentFolderPath);
    return allFolders.filter(
      folder => PathService.normalizePath(folder.path) === normalizedParentPath
    );
  }

  /**
   * 直接の子ノートを取得
   * @param folderPath フォルダパス
   * @param allNotes 全ノートの配列
   * @returns 子ノートの配列
   */
  static getChildNotes(folderPath: string, allNotes: File[]): File[] {
    const normalizedFolderPath = PathService.normalizePath(folderPath);
    return allNotes.filter(
      note => PathService.normalizePath(note.path) === normalizedFolderPath
    );
  }

  /**
   * フォルダとその子孫フォルダを全て取得
   * @param folderPath フォルダパス
   * @param allFolders 全フォルダの配列
   * @returns 子孫フォルダの配列（自身は含まない）
   */
  static getAllDescendantFolders(
    folderPath: string,
    allFolders: Folder[]
  ): Folder[] {
    const normalizedPath = PathService.normalizePath(folderPath);
    const descendants: Folder[] = [];
    const queue = [normalizedPath];

    while (queue.length > 0) {
      const currentPath = queue.shift()!;
      const children = this.getChildFolders(currentPath, allFolders);

      descendants.push(...children);

      // 子フォルダのフルパスをキューに追加
      for (const child of children) {
        const childFullPath = PathService.getFullPath(child.path, child.name, 'folder');
        queue.push(childFullPath);
      }
    }

    return descendants;
  }

  /**
   * フォルダとその子孫にある全てのノートを取得
   * @param folderPath フォルダパス
   * @param allNotes 全ノートの配列
   * @param allFolders 全フォルダの配列
   * @returns 全ノートの配列
   */
  static getAllDescendantNotes(
    folderPath: string,
    allNotes: File[],
    allFolders: Folder[]
  ): File[] {
    const normalizedPath = PathService.normalizePath(folderPath);
    const notes: File[] = [];

    // 直接の子ノート
    notes.push(...this.getChildNotes(normalizedPath, allNotes));

    // 子孫フォルダ内のノート
    const descendantFolders = this.getAllDescendantFolders(normalizedPath, allFolders);
    for (const folder of descendantFolders) {
      const folderFullPath = PathService.getFullPath(folder.path, folder.name, 'folder');
      notes.push(...this.getChildNotes(folderFullPath, allNotes));
    }

    return notes;
  }

  /**
   * フォルダが空かどうかをチェック
   * @param folderPath フォルダパス
   * @param allNotes 全ノートの配列
   * @param allFolders 全フォルダの配列
   * @returns 空の場合true
   */
  static isFolderEmpty(
    folderPath: string,
    allNotes: File[],
    allFolders: Folder[]
  ): boolean {
    const childNotes = this.getChildNotes(folderPath, allNotes);
    const childFolders = this.getChildFolders(folderPath, allFolders);
    return childNotes.length === 0 && childFolders.length === 0;
  }

  /**
   * フォルダを移動できるかバリデーション
   * @param folderId 移動するフォルダID
   * @param targetParentPath 移動先の親パス
   * @param allFolders 全フォルダの配列
   * @returns バリデーション結果
   */
  static async validateMoveOperation(
    folderId: string,
    targetParentPath: string,
    allFolders: Folder[]
  ): Promise<ValidationResult> {
    const folder = allFolders.find(f => f.id === folderId);
    if (!folder) {
      return { valid: false, error: 'フォルダが見つかりません' };
    }

    // 移動先が同じ場合
    const normalizedCurrentParent = PathService.normalizePath(folder.path);
    const normalizedTargetParent = PathService.normalizePath(targetParentPath);
    if (normalizedCurrentParent === normalizedTargetParent) {
      return { valid: false, error: '移動先が現在の場所と同じです' };
    }

    // 自分自身またはその子孫に移動しようとしていないかチェック
    const currentFullPath = PathService.getFullPath(folder.path, folder.name, 'folder');
    if (normalizedTargetParent.startsWith(currentFullPath)) {
      return { valid: false, error: 'フォルダを自分自身またはその子フォルダには移動できません' };
    }

    // 移動先に同名のフォルダがないかチェック
    const { isDuplicate } = await this.checkDuplicate(
      folder.name,
      targetParentPath,
      folderId
    );
    if (isDuplicate) {
      return { valid: false, error: '移動先に同じ名前のフォルダが既に存在します' };
    }

    return { valid: true };
  }

  /**
   * フォルダの階層の深さを取得
   * @param folderPath フォルダパス
   * @returns 階層の深さ（ルートは0）
   */
  static getFolderDepth(folderPath: string): number {
    const normalizedPath = PathService.normalizePath(folderPath);
    if (normalizedPath === '/') return 0;
    const parts = normalizedPath.slice(0, -1).split('/').filter(Boolean);
    return parts.length;
  }

  /**
   * フォルダのフルパスを取得
   * @param folder フォルダ
   * @returns フルパス
   */
  static getFullPath(folder: Folder): string {
    return PathService.getFullPath(folder.path, folder.name, 'folder');
  }
}
