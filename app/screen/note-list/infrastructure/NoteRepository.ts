/**
 * @file NoteRepository.ts
 * @summary ノートデータアクセス層
 * @description
 * AsyncStorageへのアクセスを抽象化し、データアクセスの詳細を隠蔽します。
 * ビジネスロジックは含まず、純粋にデータの永続化のみを担当します。
 */

import { File, CreateFileData } from '@shared/types/file';
import { getAllNotesRaw, saveAllNotes } from '../noteStorage/storage';
import * as NoteFns from '../noteStorage/note';

/**
 * ノートリポジトリ
 * データアクセスの単一窓口として機能
 */
export class NoteRepository {
  /**
   * 全ノートを取得
   * @returns 全ノートの配列（更新日時降順）
   */
  static async getAll(): Promise<File[]> {
    return await NoteFns.getAllNotes();
  }

  /**
   * 指定パス内のノートを取得
   * @param path フォルダパス
   * @returns パス内のノートの配列
   */
  static async getByPath(path: string): Promise<File[]> {
    return await NoteFns.getNotesByPath(path);
  }

  /**
   * IDでノートを取得
   * @param noteId ノートID
   * @returns ノート、見つからない場合はundefined
   */
  static async getById(noteId: string): Promise<File | undefined> {
    const allNotes = await getAllNotesRaw();
    return allNotes.find(note => note.id === noteId);
  }

  /**
   * 複数のノートをIDで取得
   * @param noteIds ノートIDの配列
   * @returns 見つかったノートの配列
   */
  static async getByIds(noteIds: string[]): Promise<File[]> {
    const allNotes = await getAllNotesRaw();
    return allNotes.filter(note => noteIds.includes(note.id));
  }

  /**
   * ノートを作成
   * @param data ノート作成データ
   * @returns 作成されたノート
   */
  static async create(data: CreateFileData): Promise<File> {
    return await NoteFns.createNote(data);
  }

  /**
   * ノートを更新
   * @param note 更新するノート
   * @returns 更新されたノート
   */
  static async update(note: File): Promise<File> {
    const allNotes = await getAllNotesRaw();
    const noteIndex = allNotes.findIndex(n => n.id === note.id);

    if (noteIndex === -1) {
      throw new Error(`Note with id ${note.id} not found`);
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
   * @param noteId ノートID
   */
  static async delete(noteId: string): Promise<void> {
    await NoteFns.deleteNotes([noteId]);
  }

  /**
   * 複数ノートを一括削除
   * @param noteIds ノートIDの配列
   */
  static async batchDelete(noteIds: string[]): Promise<void> {
    await NoteFns.deleteNotes(noteIds);
  }

  /**
   * 複数ノートを一括更新
   * @param notes 更新するノートの配列
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
   * @param sourceIds コピー元ノートIDの配列
   * @returns コピーされたノートの配列
   */
  static async copy(sourceIds: string[]): Promise<File[]> {
    return await NoteFns.copyNotes(sourceIds);
  }

  /**
   * ノートを移動（パス変更）
   * @param noteId ノートID
   * @param newPath 新しいフォルダパス
   * @returns 更新されたノート
   */
  static async move(noteId: string, newPath: string): Promise<File> {
    return await NoteFns.moveNote(noteId, newPath);
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
