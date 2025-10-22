/**
 * @file FileRepository.ts
 * @summary ファイルデータアクセス層
 * @description
 * AsyncStorageへのアクセスを抽象化し、データアクセスの詳細を隠蔽します。
 * ビジネスロジックは含まず、純粋にデータの永続化のみを担当します。
 */

import { File, CreateFileData } from '@shared/types/file';
import { getAllFilesRaw, saveAllFiles } from '../fileStorage/storage';
import * as FileFns from '../fileStorage/file';

/**
 * ファイルリポジトリ
 * データアクセスの単一窓口として機能
 */
export class FileRepository {
  /**
   * 全ファイルを取得
   * @returns 全ファイルの配列（更新日時降順）
   */
  static async getAll(): Promise<File[]> {
    return await FileFns.getAllFiles();
  }

  /**
   * 指定パス内のファイルを取得
   * @param path フォルダパス
   * @returns パス内のファイルの配列
   */
  static async getByPath(path: string): Promise<File[]> {
    return await FileFns.getFilesByPath(path);
  }

  /**
   * @param fileId ファイルID
   * @returns ノート、見つからない場合はundefined
   */
  static async getById(fileId: string): Promise<File | undefined> {
    const allFiles = await getAllFilesRaw();
    return allFiles.find(file => file.id === fileId);
  }

  /**
   * @param fileIds ファイルIDの配列
   * @returns 見つかったファイルの配列
   */
  static async getByIds(fileIds: string[]): Promise<File[]> {
    const allFiles = await getAllFilesRaw();
    return allFiles.filter(file => fileIds.includes(file.id));
  }

  /**
   * ファイルを作成
   * @param data ファイル作成データ
   * @returns 作成されたノート
   */
  static async create(data: CreateFileData): Promise<File> {
    return await FileFns.createFile(data);
  }

  /**
   * ファイルを更新
   * @param file 更新するファイル
   * @returns 更新されたノート
   */
  static async update(note: File): Promise<File> {
    const allFiles = await getAllFilesRaw();
    const fileIndex = allFiles.findIndex(n => n.id === file.id);

    if (fileIndex === -1) {
      throw new Error(`File with id ${file.id} not found`);
    }

    const updatedFile = {
      ...note,
      updatedAt: new Date(),
    };

    allFiles[fileIndex] = updatedFile;
    await saveAllFiles(allFiles);
    return updatedFile;
  }

  /**
   * 単一ファイルを削除
   * @param fileId ファイルID
   */
  static async delete(fileId: string): Promise<void> {
    await FileFns.deleteFiles([fileId]);
  }

  /**
   * 複数ファイルを一括削除
   * @param fileIds ファイルIDの配列
   */
  static async batchDelete(fileIds: string[]): Promise<void> {
    await FileFns.deleteFiles(fileIds);
  }

  /**
   * 複数ファイルを一括更新
   * @param notes 更新するファイルの配列
   * @description
   * 既存のファイルをIDでマッチングして更新します。
   * 見つからないIDは無視されます。
   */
  static async batchUpdate(files: File[]): Promise<void> {
    const allFiles = await getAllFilesRaw();
    const fileMap = new Map(files.map(n => [n.id, n]));

    // 既存ファイルを更新されたノートで置き換え
    const updated = allFiles.map(n => {
      const updatedFile = fileMap.get(n.id);
      if (updatedFile) {
        return {
          ...updatedFile,
          updatedAt: new Date(),
        };
      }
      return n;
    });

    await saveAllFiles(updated);
  }

  /**
   * ファイルをコピー
   * @param sourceIds コピー元ファイルIDの配列
   * @returns コピーされたファイルの配列
   */
  static async copy(sourceIds: string[]): Promise<File[]> {
    return await FileFns.copyFiles(sourceIds);
  }

  /**
   * ファイルを移動（パス変更）
   * @param fileId ファイルID
   * @param newPath 新しいフォルダパス
   * @returns 更新されたノート
   */
  static async move(fileId: string, newPath: string): Promise<File> {
    return await FileFns.moveFile(fileId, newPath);
  }

  /**
   * 全ファイルを保存（内部用）
   * @param notes 保存するファイルの配列
   * @description
   * 既存の全データを上書きします。使用には注意が必要です。
   * 通常はbatchUpdate()を使用してください。
   * @internal
   */
  static async saveAll(files: File[]): Promise<void> {
    await saveAllFiles(files);
  }
}
