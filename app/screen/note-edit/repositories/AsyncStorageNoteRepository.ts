/**
 * @file repositories/AsyncStorageNoteRepository.ts
 * @summary AsyncStorageを使用したノートリポジトリの実装
 * @description NoteEditStorageをリポジトリインターフェースに適合させたラッパー
 */

import { NoteRepository } from './NoteRepository';
import { Note, NoteVersion } from '../types';
import { CreateNoteData, UpdateNoteData } from '@shared/types/note';
import { NoteEditStorage } from '../noteStorage';

/**
 * AsyncStorageを使用したリポジトリ実装
 * 既存のNoteEditStorageをラップして、リポジトリインターフェースに適合
 */
export class AsyncStorageNoteRepository implements NoteRepository {
  async findById(id: string): Promise<Note | null> {
    return await NoteEditStorage.getNoteById(id);
  }

  async findAll(): Promise<Note[]> {
    // NoteEditStorageにfindAllがないため、空配列を返す
    // 必要に応じて実装を追加
    return [];
  }

  async create(data: CreateNoteData): Promise<Note> {
    return await NoteEditStorage.createNote(data);
  }

  async update(id: string, data: Partial<UpdateNoteData>): Promise<Note> {
    return await NoteEditStorage.updateNote({
      id,
      ...data,
    } as UpdateNoteData);
  }

  async delete(): Promise<void> {
    // NoteEditStorageにdeleteがないため、未実装
    // 必要に応じて実装を追加
    throw new Error('Delete operation not implemented');
  }

  async getVersions(noteId: string): Promise<NoteVersion[]> {
    return await NoteEditStorage.getNoteVersions(noteId);
  }

  async restoreVersion(noteId: string, versionId: string): Promise<Note> {
    return await NoteEditStorage.restoreNoteVersion(noteId, versionId);
  }
}
