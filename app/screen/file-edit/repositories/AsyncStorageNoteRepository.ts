/**
 * @file repositories/AsyncStorageNoteRepository.ts
 * @summary AsyncStorageを使用したノートリポジトリの実装
 * @description NoteEditStorageをリポジトリインターフェースに適合させたラッパー
 */

import { NoteRepository } from './NoteRepository';
import { File, FileVersion } from '../types';
import { CreateFileData, UpdateFileData } from '@shared/types/file';
import { NoteEditStorage } from './noteStorage';

/**
 * AsyncStorageを使用したリポジトリ実装
 * 既存のNoteEditStorageをラップして、リポジトリインターフェースに適合
 */
export class AsyncStorageNoteRepository implements NoteRepository {
  async findById(id: string): Promise<File | null> {
    return await NoteEditStorage.getNoteById(id);
  }

  async findAll(): Promise<File[]> {
    // NoteEditStorageにfindAllがないため、空配列を返す
    // 必要に応じて実装を追加
    return [];
  }

  async create(data: CreateFileData): Promise<File> {
    return await NoteEditStorage.createNote(data);
  }

  async update(id: string, data: Partial<UpdateFileData>): Promise<File> {
    return await NoteEditStorage.updateNote({
      id,
      ...data,
    } as UpdateFileData);
  }

  async delete(): Promise<void> {
    // NoteEditStorageにdeleteがないため、未実装
    // 必要に応じて実装を追加
    throw new Error('Delete operation not implemented');
  }

  async getVersions(noteId: string): Promise<FileVersion[]> {
    return await NoteEditStorage.getNoteVersions(noteId);
  }

  async restoreVersion(noteId: string, versionId: string): Promise<File> {
    return await NoteEditStorage.restoreNoteVersion(noteId, versionId);
  }
}
