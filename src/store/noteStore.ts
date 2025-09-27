import { create } from 'zustand';
import { Note } from '../../shared/types/note';
import * as storageService from '../services/storageService';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

interface NoteState {
  notes: Note[];
  activeNote: Note | null;
  draftNote: { title: string; content: string } | null; // For holding edits before diffing
  isLoading: boolean;
  fetchNotes: () => Promise<void>;
  selectNote: (noteId: string | null) => Promise<void>;
  setDraftNote: (draft: { title: string; content: string } | null) => void;
  saveNote: () => Promise<Note>;
  createNewNote: () => void;
  deleteNote: (noteId: string) => Promise<void>;
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  activeNote: null,
  draftNote: null,
  isLoading: true,
  fetchNotes: async () => {
    set({ isLoading: true });
    try {
      const notes = await storageService.getAllNotes();
      set({ notes, isLoading: false });
    } catch (error) {
      console.error("Failed to fetch notes.", error);
      set({ isLoading: false });
    }
  },
  selectNote: async (noteId) => {
    if (!noteId) {
      set({ activeNote: null });
      return;
    }
    set({ isLoading: true });
    try {
      const note = await storageService.getNoteById(noteId);
      set({ activeNote: note, isLoading: false });
    } catch (error) {
      console.error(`Failed to select note with id: ${noteId}`, error);
      set({ isLoading: false });
    }
  },
  setDraftNote: (draft) => {
    set({ draftNote: draft });
  },
  saveNote: async () => {
    const now = new Date();
    const { activeNote, draftNote } = get();

    if (!draftNote) {
      throw new Error("Draft note is not set. Cannot save.");
    }

    let noteToSave: Note;

    try {
      if (activeNote) {
        // 既存のノートを更新
        noteToSave = {
          ...activeNote,
          title: draftNote.title,
          content: draftNote.content,
          updatedAt: now,
          version: activeNote.version + 1,
        };
      } else {
        // 新規ノート作成
        noteToSave = {
          id: uuidv4(),
          title: draftNote.title,
          content: draftNote.content,
          createdAt: now,
          updatedAt: now,
          version: 1,
        };
      }

      // 保存前にログを出力してデバッグ
      console.log("Saving note:", JSON.stringify(noteToSave));
      
      const saved = await storageService.saveNote(noteToSave);
      // ノート一覧を更新し、保存されたノートをアクティブに設定
      await get().fetchNotes();
      set({ activeNote: saved, draftNote: null }); // 保存後にドラフトをクリア
      return saved;
    } catch (error) {
      console.error("Failed to save note.", error);
      // UIで処理できるようにエラーを再スロー
      throw new Error("Failed to save the note.");
    }
  },
  createNewNote: () => {
     set({ activeNote: null }); // Deselect any active note to signal creation
  },
  deleteNote: async (noteId) => {
    try {
      await storageService.deleteNoteById(noteId);
      // Refresh the notes list
      await get().fetchNotes();
      // If the deleted note was the active one, clear it
      if (get().activeNote?.id === noteId) {
        set({ activeNote: null });
      }
    } catch (error) {
      console.error(`Failed to delete note with id: ${noteId}`, error);
      throw error;
    }
  },
}));
