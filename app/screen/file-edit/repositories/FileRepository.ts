/**
 * @file repositories/FileRepository.ts
 * @summary ファイルデータアクセス層のインターフェース
 * @description データソースの抽象化により、実装の差し替えを容易にする
 */

import { File, FileVersion } from '../types';
import { CreateFileData, UpdateFileData } from '@shared/types/file';

/**
 * ファイルリポジトリのインターフェース
 * データソースとの通信方法を抽象化
 */
export interface FileRepository {
  /**
   * IDでファイルを検索
   */
  findById(id: string): Promise<File | null>;

  /**
   * すべてのファイルを取得
   */
  findAll(): Promise<File[]>;

  /**
   * 新しいファイルを作成
   */
  create(data: CreateFileData): Promise<File>;

  /**
   * ファイルを更新
   */
  update(id: string, data: Partial<UpdateFileData>): Promise<File>;

  /**
   * ファイルを削除
   */
  delete(id: string): Promise<void>;

  /**
   * ファイルのバージョン履歴を取得
   */
  getVersions(fileId: string): Promise<FileVersion[]>;

  /**
   * 特定のバージョンを復元
   */
  restoreVersion(fileId: string, versionId: string): Promise<File>;
}
