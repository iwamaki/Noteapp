/**
 * @file noteStore.ts
 * @summary ノートの基本CRUD操作を管理するストア
 * @responsibility ノート一覧の取得、選択、作成、更新、削除、検索などの基本操作を管理
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { NoteStorageService, Note, CreateNoteData, UpdateNoteData, StorageError } from '../../services/storageService';
import 'react-native-get-random-values';

// 型定義
export interface NoteError {
  code: string;
  message: string;
  timestamp: Date;
}

export interface LoadingState {
  isLoading: boolean;
  operation?: 'fetch' | 'save' | 'delete' | 'create';
}

interface NoteStoreState {
  // データ
  notes: Note[];
  activeNote: Note | null;

  // 状態
  loading: LoadingState;
  error: NoteError | null;
  lastUpdated: Date | null;

  // 検索・フィルタ
  searchQuery: string;
  filteredNotes: Note[];

  // アクション
  fetchNotes: () => Promise<void>;
  selectNote: (noteId: string | null) => Promise<void>;
  createNote: (data: CreateNoteData) => Promise<Note>;
  updateNote: (data: UpdateNoteData) => Promise<Note>;
  deleteNote: (noteId: string) => Promise<void>;
  searchNotes: (query: string) => void;
  clearError: () => void;
}

// エラーハンドリングヘルパー
const createNoteError = (error: unknown, code: string): NoteError => {
  const message = error instanceof Error ? error.message : String(error);
  return {
    code,
    message,
    timestamp: new Date()
  };
};

// フィルタリングヘルパー
const filterNotes = (notes: Note[], query: string): Note[] => {
  if (!query.trim()) return notes;

  const searchTerm = query.toLowerCase();
  return notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm) ||
    note.content.toLowerCase().includes(searchTerm) ||
    note.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
  );
};

export const useNoteStore = create<NoteStoreState>()(
  subscribeWithSelector((set, get) => ({
    // 初期状態
    notes: [],
    activeNote: null,
    loading: { isLoading: false },
    error: null,
    lastUpdated: null,
    searchQuery: '',
    filteredNotes: [],

    // ノート一覧取得
    fetchNotes: async () => {
      const setLoading = (isLoading: boolean, operation?: LoadingState['operation']) =>
        set({ loading: { isLoading, operation } });

      setLoading(true, 'fetch');
      set({ error: null });

      try {
        const notes = await NoteStorageService.getAllNotes();
        const { searchQuery } = get();

        set({
          notes,
          filteredNotes: filterNotes(notes, searchQuery),
          lastUpdated: new Date(),
        });
      } catch (error) {
        console.error('Failed to fetch notes:', error);
        set({
          error: createNoteError(error, 'FETCH_ERROR'),
          notes: [],
          filteredNotes: []
        });
      } finally {
        setLoading(false);
      }
    },

    // ノート選択
    selectNote: async (noteId) => {
      if (!noteId) {
        set({ activeNote: null });
        // noteDraftStoreのdraftNoteもクリア (必要に応じて)
        return;
      }

      const setLoading = (isLoading: boolean) =>
        set({ loading: { isLoading, operation: 'fetch' } });

      setLoading(true);
      set({ error: null });

      try {
        const note = await NoteStorageService.getNoteById(noteId);
        if (!note) {
          throw new StorageError(`Note with id ${noteId} not found`, 'NOT_FOUND');
        }

        set({ activeNote: note });

        // 他のストアにも通知: noteDraftStoreのdraftNoteをセット
        // (これは各コンポーネント側で明示的に行うべきなので、ここでは行わない)
      } catch (error) {
        console.error(`Failed to select note with id: ${noteId}`, error);
        set({
          error: createNoteError(error, 'SELECT_ERROR'),
          activeNote: null
        });
      } finally {
        setLoading(false);
      }
    },

    // 新規ノート作成
    createNote: async (data) => {
      const setLoading = (isLoading: boolean) =>
        set({ loading: { isLoading, operation: 'create' } });

      setLoading(true);
      set({ error: null });

      try {
        const newNote = await NoteStorageService.createNote(data);
        await get().fetchNotes();

        set({ activeNote: newNote });

        return newNote;
      } catch (error) {
        console.error('Failed to create note:', error);
        const noteError = createNoteError(error, 'CREATE_ERROR');
        set({ error: noteError });
        throw noteError;
      } finally {
        setLoading(false);
      }
    },

    // ノート更新
    updateNote: async (data) => {
      const setLoading = (isLoading: boolean) =>
        set({ loading: { isLoading, operation: 'save' } });

      setLoading(true);
      set({ error: null });

      try {
        const updatedNote = await NoteStorageService.updateNote(data);
        await get().fetchNotes();

        const { activeNote } = get();
        if (activeNote?.id === updatedNote.id) {
          set({ activeNote: updatedNote });
        }

        return updatedNote;
      } catch (error) {
        console.error('Failed to update note:', error);
        const noteError = createNoteError(error, 'UPDATE_ERROR');
        set({ error: noteError });
        throw noteError;
      } finally {
        setLoading(false);
      }
    },

    // ノート削除
    deleteNote: async (noteId) => {
      const setLoading = (isLoading: boolean) =>
        set({ loading: { isLoading, operation: 'delete' } });

      setLoading(true);
      set({ error: null });

      try {
        await NoteStorageService.deleteNote(noteId);
        await get().fetchNotes();

        // 削除されたノートがアクティブだった場合はクリア
        const { activeNote } = get();
        if (activeNote?.id === noteId) {
          set({ activeNote: null });
        }
      } catch (error) {
        console.error(`Failed to delete note with id: ${noteId}`, error);
        const noteError = createNoteError(error, 'DELETE_ERROR');
        set({ error: noteError });
        throw noteError;
      } finally {
        setLoading(false);
      }
    },

    // ノート検索
    searchNotes: (query) => {
      const { notes } = get();
      set({
        searchQuery: query,
        filteredNotes: filterNotes(notes, query)
      });
    },

    // エラークリア
    clearError: () => {
      set({ error: null });
    },
  }))
);
