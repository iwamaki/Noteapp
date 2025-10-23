/**
 * @file repositories/AsyncStorageFileRepository.ts
 * @summary AsyncStorageを使用したファイルリポジトリの実装
 * @description 統一リポジトリをリポジトリインターフェースに適合させたラッパー
 */

import { FileRepository as FileRepositoryInterface } from './FileRepository';
import { File, FileVersion } from '../types';
import { CreateFileData, UpdateFileData } from '@shared/types/file';
import { FileRepository as UnifiedFileRepository } from '@data/fileRepository';

/**
 * AsyncStorageを使用したリポジトリ実装
 * 統一リポジトリをラップして、リポジトリインターフェースに適合
 */
export class AsyncStorageFileRepository implements FileRepositoryInterface {
  async findById(id: string): Promise<File | null> {
    return await UnifiedFileRepository.getById(id);
  }

  async findAll(): Promise<File[]> {
    return await UnifiedFileRepository.getAll();
  }

  async create(data: CreateFileData): Promise<File> {
    return await UnifiedFileRepository.createWithVersion(data);
  }

  async update(id: string, data: Partial<UpdateFileData>): Promise<File> {
    return await UnifiedFileRepository.updateWithVersion({
      id,
      ...data,
    } as UpdateFileData);
  }

  async delete(): Promise<void> {
    throw new Error('Delete operation not implemented in this interface');
  }

  async getVersions(fileId: string): Promise<FileVersion[]> {
    return await UnifiedFileRepository.getVersions(fileId);
  }

  async restoreVersion(fileId: string, versionId: string): Promise<File> {
    return await UnifiedFileRepository.restoreVersion(fileId, versionId);
  }
}
