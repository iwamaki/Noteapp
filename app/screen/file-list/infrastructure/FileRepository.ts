/**
 * @file FileRepository.ts
 * @summary ノートデータアクセス層
 * @description
 * AsyncStorageへのアクセスを抽象化し、データアクセスの詳細を隠蔽します。
 * ビジネスロジックは含まず、純粋にデータの永続化のみを担当します。
 */

import { File, CreateFileData } from '@shared/types/file';
import { getAllNotesRaw, saveAllNotes } from '../fileStorage/storage';
import * as FileFns from '../fileStorage/file';

/**
 * ノートリポジトリ
 * データアクセスの単一窓口として機能
 */
export class FileRepository {
  /**
   * 全ノートを取得
   * @returns 全ノートの配列（更新日時降順）
   */
  static async getAll(): Promise<File[]> {
    return await FileFns.getAllFiles();
  }

  /**
   * 指定パス内のノートを取得
   * @param path フォルダパス
   * @returns パス内のノートの配列
   */
  static async getByPath(path: string): Promise<File[]> {
    return await FileFns.getFilesByPath(path);
  }

  /**
   * @param fileId ファイルID
   * @returns ノート、見つからない場合はundefined
   */
  static async getById(fileId: string): Promise<File | undefined> {
    const allNotes = await getAllNotesRaw();
    return allNotes.find(file => file.id === fileId);
  }

  /**
   * @param fileIds ファイルIDの配列
   * @returns 見つかったノートの配列
   */
  static async getByIds(fileIds: string[]): Promise<File[]> {
    const allNotes = await getAllNotesRaw();
    return allNotes.filter(file => fileIds.includes(file.id));
  }

  /**
   * ノートを作成
   * @param data ノート作成データ
   * @returns 作成されたノート
   */
  static async create(data: CreateFileData): Promise<File> {
    return await FileFns.createFile(data);
  }

  /**
   * ノートを更新
   * @param file 更新するファイル
   * @returns 更新されたノート
   */
  static async update(note: File): Promise<File> {
    const allNotes = await getAllNotesRaw();
    const noteIndex = allNotes.findIndex(n => n.id === note.id);

    if (noteIndex === -1) {
      throw new Error(`File with id ${note.id} not found`);
    }

    const updatedNote = {
      ...note,
      updatedAt: new Date(),
    };

    allNotes[noteIndex] = updatedNote;
    await saveAllNotes(allNotes);
    return updatedNote;
  }

  /**
   * 単一ノートを削除
   * @param fileId ファイルID
   */
  static async delete(fileId: string): Promise<void> {
    await FileFns.deleteFiles([fileId]);
  }

  /**
   * 複数ノートを一括削除
   * @param fileIds ファイルIDの配列
   */
  static async batchDelete(fileIds: string[]): Promise<void> {
    await FileFns.deleteFiles(fileIds);
  }

  /**
   * 複数ノートを一括更新
   * @param notes 更新するファイルの配列
   * @description
   * 既存のノートをIDでマッチングして更新します。
   * 見つからないIDは無視されます。
   */
  static async batchUpdate(notes: File[]): Promise<void> {
    const allNotes = await getAllNotesRaw();
    const noteMap = new Map(notes.map(n => [n.id, n]));

    // 既存ノートを更新されたノートで置き換え
    const updated = allNotes.map(n => {
      const updatedNote = noteMap.get(n.id);
      if (updatedNote) {
        return {
          ...updatedNote,
          updatedAt: new Date(),
        };
      }
      return n;
    });

    await saveAllNotes(updated);
  }

  /**
   * ノートをコピー
   * @param sourceIds コピー元ファイルIDの配列
   * @returns コピーされたノートの配列
   */
  static async copy(sourceIds: string[]): Promise<File[]> {
    return await FileFns.copyFiles(sourceIds);
  }

  /**
   * ノートを移動（パス変更）
   * @param fileId ファイルID
   * @param newPath 新しいフォルダパス
   * @returns 更新されたノート
   */
  static async move(fileId: string, newPath: string): Promise<File> {
    return await FileFns.moveFile(fileId, newPath);
  }

  /**
   * 全ノートを保存（内部用）
   * @param notes 保存するノートの配列
   * @description
   * 既存の全データを上書きします。使用には注意が必要です。
   * 通常はbatchUpdate()を使用してください。
   * @internal
   */
  static async saveAll(notes: File[]): Promise<void> {
    await saveAllNotes(notes);
  }
}
