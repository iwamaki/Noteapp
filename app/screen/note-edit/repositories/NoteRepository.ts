/**
 * @file repositories/NoteRepository.ts
 * @summary ノートデータアクセス層のインターフェース
 * @description データソースの抽象化により、実装の差し替えを容易にする
 */

import { Note, NoteVersion } from '../types';
import { CreateNoteData, UpdateNoteData } from '@shared/types/note';

/**
 * ノートリポジトリのインターフェース
 * データソースとの通信方法を抽象化
 */
export interface NoteRepository {
  /**
   * IDでノートを検索
   */
  findById(id: string): Promise<Note | null>;

  /**
   * すべてのノートを取得
   */
  findAll(): Promise<Note[]>;

  /**
   * 新しいノートを作成
   */
  create(data: CreateNoteData): Promise<Note>;

  /**
   * ノートを更新
   */
  update(id: string, data: Partial<UpdateNoteData>): Promise<Note>;

  /**
   * ノートを削除
   */
  delete(id: string): Promise<void>;

  /**
   * ノートのバージョン履歴を取得
   */
  getVersions(noteId: string): Promise<NoteVersion[]>;

  /**
   * 特定のバージョンを復元
   */
  restoreVersion(noteId: string, versionId: string): Promise<Note>;
}
