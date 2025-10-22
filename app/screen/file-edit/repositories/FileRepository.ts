/**
 * @file repositories/NoteRepository.ts
 * @summary ノートデータアクセス層のインターフェース
 * @description データソースの抽象化により、実装の差し替えを容易にする
 */

import { File, FileVersion } from '../types';
import { CreateFileData, UpdateFileData } from '@shared/types/file';

/**
 * ノートリポジトリのインターフェース
 * データソースとの通信方法を抽象化
 */
export interface NoteRepository {
  /**
   * IDでノートを検索
   */
  findById(id: string): Promise<File | null>;

  /**
   * すべてのノートを取得
   */
  findAll(): Promise<File[]>;

  /**
   * 新しいノートを作成
   */
  create(data: CreateFileData): Promise<File>;

  /**
   * ノートを更新
   */
  update(id: string, data: Partial<UpdateFileData>): Promise<File>;

  /**
   * ノートを削除
   */
  delete(id: string): Promise<void>;

  /**
   * ノートのバージョン履歴を取得
   */
  getVersions(noteId: string): Promise<FileVersion[]>;

  /**
   * 特定のバージョンを復元
   */
  restoreVersion(noteId: string, versionId: string): Promise<File>;
}
