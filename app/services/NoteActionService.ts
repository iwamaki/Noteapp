/**
 * @file NoteActionService.ts
 * @summary ノートに関連する永続化アクション（一括削除、一括コピー、ドラフト保存など）を処理するサービス。
 * @responsibility NoteStorageServiceを介して実際のデータ操作を行い、EventBusを通じて結果を通知します。
 * これにより、ストアから永続化ロジックを分離し、責務を明確にします。
 */

import { Note, CreateNoteData } from '../../shared/types/note';
import { NoteStorageService, StorageError } from './storageService';
import { eventBus } from './eventBus';
import { DraftNote } from '../store/note/noteDraftStore';
import { v4 as uuidv4 } from 'uuid';

export class NoteActionService {
  /**
   * 複数のノートを一括で削除し、結果をイベントバスに通知します。
   * @param noteIds 削除するノートのIDの配列
   */
  static async bulkDeleteNotes(noteIds: string[]): Promise<void> {
    try {
      for (const noteId of noteIds) {
        await NoteStorageService.deleteNote(noteId);
      }
      await eventBus.emit('notes:bulk-deleted', { noteIds });
    } catch (error: any) {
      console.error('Failed to bulk delete notes:', error);
      await eventBus.emit('error:occurred', {
        error: error instanceof StorageError ? error : new Error(error.message),
        context: 'bulk-delete-notes',
      });
      throw error;
    }
  }

  /**
   * 複数のノートを一括でコピーし、結果をイベントバスに通知します。
   * @param sourceIds コピー元となるノートのIDの配列
   * @returns コピーして新しく作成されたノートの配列
   */
  static async bulkCopyNotes(sourceIds: string[]): Promise<Note[]> {
    const newNotes: Note[] = [];
    try {
      for (const noteId of sourceIds) {
        const originalNote = await NoteStorageService.getNoteById(noteId);
        if (originalNote) {
          const newNoteData: CreateNoteData = {
            title: `${originalNote.title} (コピー)`,
            content: originalNote.content,
            tags: originalNote.tags,
          };
          const newNote = await NoteStorageService.createNote(newNoteData);
          newNotes.push(newNote);
        }
      }
      await eventBus.emit('notes:bulk-copied', { sourceIds, newNotes });
      return newNotes;
    } catch (error: any) {
      console.error('Failed to bulk copy notes:', error);
      await eventBus.emit('error:occurred', {
        error: error instanceof StorageError ? error : new Error(error.message),
        context: 'bulk-copy-notes',
      });
      throw error;
    }
  }

  /**
   * ドラフトノートを保存します。既存のノートであれば更新、新規であれば作成します。
   * 保存後、結果をイベントバスに通知します。
   * @param draftNote 保存するドラフトノートのデータ
   * @param activeNoteId ドラフトが関連付けられている既存のノートのID (新規の場合はnull)
   * @returns 保存または更新されたノート
   */
  static async saveDraftNote(draftNote: DraftNote, activeNoteId: string | null): Promise<Note> {
    try {
      let savedNote: Note;
      if (activeNoteId) {
        // 既存のノートを更新
        savedNote = await NoteStorageService.updateNote({
          id: activeNoteId,
          title: draftNote.title,
          content: draftNote.content,
          tags: draftNote.tags,
        });
        await eventBus.emit('note:updated', { note: savedNote });
      } else {
        // 新規ノートを作成
        savedNote = await NoteStorageService.createNote({
          title: draftNote.title,
          content: draftNote.content,
          tags: draftNote.tags,
        });
        await eventBus.emit('note:created', { note: savedNote });
      }
      await eventBus.emit('draft:saved', { note: savedNote });
      return savedNote;
    } catch (error: any) {
      console.error('Failed to save draft note:', error);
      await eventBus.emit('error:occurred', {
        error: error instanceof StorageError ? error : new Error(error.message),
        context: 'save-draft-note',
      });
      throw error;
    }
  }
}
