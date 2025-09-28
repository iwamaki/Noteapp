import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { NoteStorageService, Note, CreateNoteData, UpdateNoteData, StorageError } from '../services/storageService';
import 'react-native-get-random-values';

// より具体的な型定義
export interface DraftNote {
  title: string;
  content: string;
  tags?: string[];
}

export interface NoteError {
  code: string;
  message: string;
  timestamp: Date;
}

export interface LoadingState {
  isLoading: boolean;
  operation?: 'fetch' | 'save' | 'delete' | 'create';
}

interface NoteState {
  // データ
  notes: Note[];
  activeNote: Note | null;
  draftNote: DraftNote | null;
  
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
  setDraftNote: (draft: DraftNote | null) => void;
  saveDraftNote: () => Promise<Note>;
  createNote: (data: CreateNoteData) => Promise<Note>;
  updateNote: (data: UpdateNoteData) => Promise<Note>;
  deleteNote: (noteId: string) => Promise<void>;
  searchNotes: (query: string) => void;
  clearError: () => void;
  
  // 編集状態管理
  isDraftModified: () => boolean;
  discardDraft: () => void;
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

export const useNoteStore = create<NoteState>()(
  subscribeWithSelector((set, get) => ({
    // 初期状態
    notes: [],
    activeNote: null,
    draftNote: null,
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
        set({ activeNote: null, draftNote: null });
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
        
        set({ 
          activeNote: note,
          draftNote: {
            title: note.title,
            content: note.content,
            tags: note.tags
          }
        });
      } catch (error) {
        console.error(`Failed to select note with id: ${noteId}`, error);
        set({ 
          error: createNoteError(error, 'SELECT_ERROR'),
          activeNote: null,
          draftNote: null
        });
      } finally {
        setLoading(false);
      }
    },

    // ドラフト設定
    setDraftNote: (draft) => {
      set({ draftNote: draft });
    },

    // ドラフト保存
    saveDraftNote: async () => {
      const { activeNote, draftNote } = get();
      
      if (!draftNote) {
        throw new Error('Draft note is not set. Cannot save.');
      }

      const setLoading = (isLoading: boolean) =>
        set({ loading: { isLoading, operation: 'save' } });

      setLoading(true);
      set({ error: null });

      try {
        let savedNote: Note;

        if (activeNote) {
          // 既存ノート更新
          savedNote = await NoteStorageService.updateNote({
            id: activeNote.id,
            ...draftNote
          });
        } else {
          // 新規ノート作成
          savedNote = await NoteStorageService.createNote(draftNote);
        }

        // ストア状態更新
        await get().fetchNotes();
        set({ 
          activeNote: savedNote,
          draftNote: {
            title: savedNote.title,
            content: savedNote.content,
            tags: savedNote.tags
          }
        });

        return savedNote;
      } catch (error) {
        console.error('Failed to save note:', error);
        const noteError = createNoteError(error, 'SAVE_ERROR');
        set({ error: noteError });
        throw noteError;
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
        
        set({
          activeNote: newNote,
          draftNote: {
            title: newNote.title,
            content: newNote.content,
            tags: newNote.tags
          }
        });

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
          set({
            activeNote: updatedNote,
            draftNote: {
              title: updatedNote.title,
              content: updatedNote.content,
              tags: updatedNote.tags
            }
          });
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
          set({ activeNote: null, draftNote: null });
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

    // ドラフト変更状態チェック
    isDraftModified: () => {
      const { activeNote, draftNote } = get();
      
      if (!draftNote) return false;
      if (!activeNote) return Boolean(draftNote.title || draftNote.content);
      
      return (
        activeNote.title !== draftNote.title ||
        activeNote.content !== draftNote.content ||
        JSON.stringify(activeNote.tags || []) !== JSON.stringify(draftNote.tags || [])
      );
    },

    // ドラフト破棄
    discardDraft: () => {
      const { activeNote } = get();
      
      if (activeNote) {
        set({
          draftNote: {
            title: activeNote.title,
            content: activeNote.content,
            tags: activeNote.tags
          }
        });
      } else {
        set({ draftNote: null });
      }
    },
  }))
);

// 便利なセレクター
export const useNoteStoreSelectors = () => {
  const notes = useNoteStore(state => state.filteredNotes);
  const activeNote = useNoteStore(state => state.activeNote);
  const draftNote = useNoteStore(state => state.draftNote);
  const loading = useNoteStore(state => state.loading);
  const error = useNoteStore(state => state.error);
  const isDraftModified = useNoteStore(state => state.isDraftModified());
  
  return {
    notes,
    activeNote,
    draftNote,
    loading,
    error,
    isDraftModified
  };
};

// アクションセレクター
export const useNoteStoreActions = () => {
  const fetchNotes = useNoteStore(state => state.fetchNotes);
  const selectNote = useNoteStore(state => state.selectNote);
  const setDraftNote = useNoteStore(state => state.setDraftNote);
  const saveDraftNote = useNoteStore(state => state.saveDraftNote);
  const createNote = useNoteStore(state => state.createNote);
  const updateNote = useNoteStore(state => state.updateNote);
  const deleteNote = useNoteStore(state => state.deleteNote);
  const searchNotes = useNoteStore(state => state.searchNotes);
  const clearError = useNoteStore(state => state.clearError);
  const discardDraft = useNoteStore(state => state.discardDraft);

  return {
    fetchNotes,
    selectNote,
    setDraftNote,
    saveDraftNote,
    createNote,
    updateNote,
    deleteNote,
    searchNotes,
    clearError,
    discardDraft
  };
};
