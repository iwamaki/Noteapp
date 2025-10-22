/**
 * @file repositories/AsyncStorageNoteRepository.ts
 * @summary AsyncStorageを使用したファイルリポジトリの実装
 * @description NoteEditStorageをリポジトリインターフェースに適合させたラッパー
 */

import { FileRepository } from './FileRepository';
import { File, FileVersion } from '../types';
import { CreateFileData, UpdateFileData } from '@shared/types/file';
import { FileEditStorage } from './fileStorage';

/**
 * AsyncStorageを使用したリポジトリ実装
 * 既存のNoteEditStorageをラップして、リポジトリインターフェースに適合
 */
export class AsyncStorageFileRepository implements FileRepository {
  async findById(id: string): Promise<File | null> {
    return await FileEditStorage.getFileById(id);
  }

  async findAll(): Promise<File[]> {
    // NoteEditStorageにfindAllがないため、空配列を返す
    // 必要に応じて実装を追加
    return [];
  }

  async create(data: CreateFileData): Promise<File> {
    return await FileEditStorage.createFile(data);
  }

  async update(id: string, data: Partial<UpdateFileData>): Promise<File> {
    return await FileEditStorage.updateFile({
      id,
      ...data,
    } as UpdateFileData);
  }

  async delete(): Promise<void> {
    // NoteEditStorageにdeleteがないため、未実装
    // 必要に応じて実装を追加
    throw new Error('Delete operation not implemented');
  }

  async getVersions(fileId: string): Promise<FileVersion[]> {
    return await FileEditStorage.getFileVersions(fileId);
  }

  async restoreVersion(fileId: string, versionId: string): Promise<File> {
    return await FileEditStorage.restoreFileVersion(fileId, versionId);
  }
}
