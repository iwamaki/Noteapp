// ============================================
// Zustand Store実装例 (stores/NoteEditorStore.ts)
// ============================================

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { EditorState, EditorError, ErrorCode, Note } from '../types';
import { noteService } from '../services/NoteService';
import { HistoryManager } from './HistoryManager';

interface NoteEditorStore extends EditorState {
  // 状態
  noteId: string | null;
  originalNote: Note | null;
  history: HistoryManager;
  
  // アクション
  initialize: (noteId?: string) => Promise<void>;
  setContent: (content: string) => void;
  setTitle: (title: string) => void;
  save: () => Promise<void>;
  undo: () => void;
  redo: () => void;
  toggleWordWrap: () => void;
  setViewMode: (mode: ViewMode) => void;
  reset: () => void;
  cleanup: () => void;
  
  // 計算プロパティ
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useNoteEditorStore = create<NoteEditorStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // 初期状態
        note: null,
        content: '',
        title: '',
        isDirty: false,
        isLoading: false,
        isSaving: false,
        error: null,
        viewMode: 'edit',
        wordWrap: true,
        noteId: null,
        originalNote: null,
        history: new HistoryManager(),
        
        // 初期化
        initialize: async (noteId?: string) => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
            state.noteId = noteId || null;
          });
          
          try {
            if (noteId) {
              const note = await noteService.loadNote(noteId);
              set((state) => {
                state.note = note;
                state.originalNote = note;
                state.content = note.content;
                state.title = note.title;
                state.isDirty = false;
                state.isLoading = false;
              });
              get().history.reset(note.content);
            } else {
              // 新規作成
              set((state) => {
                state.note = null;
                state.originalNote = null;
                state.content = '';
                state.title = '';
                state.isDirty = false;
                state.isLoading = false;
              });
              get().history.reset('');
            }
          } catch (error) {
            set((state) => {
              state.isLoading = false;
              state.error = error as EditorError;
            });
          }
        },
        
        // コンテンツ設定
        setContent: (content: string) => {
          const { originalNote, history } = get();
          
          set((state) => {
            state.content = content;
            state.isDirty = 
              content !== originalNote?.content || 
              state.title !== originalNote?.title;
          });
          
          history.push(content);
        },
        
        // タイトル設定
        setTitle: (title: string) => {
          const { originalNote, content } = get();
          
          set((state) => {
            state.title = title;
            state.isDirty = 
              content !== originalNote?.content || 
              title !== originalNote?.title;
          });
        },
        
        // 保存
        save: async () => {
          const { noteId, title, content, isDirty } = get();
          
          if (!isDirty) {
            return;
          }
          
          set((state) => {
            state.isSaving = true;
            state.error = null;
          });
          
          try {
            const savedNote = await noteService.save({
              id: noteId,
              title,
              content,
            });
            
            set((state) => {
              state.isSaving = false;
              state.isDirty = false;
              state.note = savedNote;
              state.originalNote = savedNote;
              state.noteId = savedNote.id;
            });
          } catch (error) {
            set((state) => {
              state.isSaving = false;
              state.error = error as EditorError;
            });
            throw error;
          }
        },
        
        // Undo
        undo: () => {
          const { history } = get();
          const content = history.undo();
          
          if (content !== null) {
            set((state) => {
              state.content = content;
              state.isDirty = 
                content !== state.originalNote?.content || 
                state.title !== state.originalNote?.title;
            });
          }
        },
        
        // Redo
        redo: () => {
          const { history } = get();
          const content = history.redo();
          
          if (content !== null) {
            set((state) => {
              state.content = content;
              state.isDirty = 
                content !== state.originalNote?.content || 
                state.title !== state.originalNote?.title;
            });
          }
        },
        
        // ワードラップ切り替え
        toggleWordWrap: () => {
          set((state) => {
            state.wordWrap = !state.wordWrap;
          });
        },
        
        // ビューモード設定
        setViewMode: (mode: ViewMode) => {
          set((state) => {
            state.viewMode = mode;
          });
        },
        
        // リセット
        reset: () => {
          const { originalNote } = get();
          
          if (originalNote) {
            set((state) => {
              state.content = originalNote.content;
              state.title = originalNote.title;
              state.isDirty = false;
              state.error = null;
            });
            get().history.reset(originalNote.content);
          }
        },
        
        // クリーンアップ
        cleanup: () => {
          get().history.clear();
          
          set((state) => {
            state.note = null;
            state.content = '';
            state.title = '';
            state.isDirty = false;
            state.isLoading = false;
            state.isSaving = false;
            state.error = null;
            state.noteId = null;
            state.originalNote = null;
          });
        },
        
        // 計算プロパティ
        canUndo: () => get().history.canUndo(),
        canRedo: () => get().history.canRedo(),
      }))
    )
  )
);

// ============================================
// 履歴管理クラス (stores/HistoryManager.ts)
// ============================================

export class HistoryManager {
  private past: string[] = [];
  private present: string = '';
  private future: string[] = [];
  private maxHistorySize = 100;
  private debounceTimer: NodeJS.Timeout | null = null;
  private debounceDelay = 300;
  
  reset(initialContent: string): void {
    this.past = [];
    this.present = initialContent;
    this.future = [];
    this.clearDebounce();
  }
  
  push(content: string): void {
    this.clearDebounce();
    
    this.debounceTimer = setTimeout(() => {
      this.addToHistory(content);
    }, this.debounceDelay);
  }
  
  private addToHistory(content: string): void {
    if (content === this.present) {
      return;
    }
    
    // 現在の状態を過去に追加
    this.past.push(this.present);
    
    // サイズ制限
    if (this.past.length > this.maxHistorySize) {
      this.past.shift();
    }
    
    // 現在の状態を更新
    this.present = content;
    
    // 未来をクリア（新しい分岐）
    this.future = [];
  }
  
  undo(): string | null {
    if (this.past.length === 0) {
      return null;
    }
    
    const previous = this.past.pop()!;
    this.future.unshift(this.present);
    this.present = previous;
    
    return this.present;
  }
  
  redo(): string | null {
    if (this.future.length === 0) {
      return null;
    }
    
    const next = this.future.shift()!;
    this.past.push(this.present);
    this.present = next;
    
    return this.present;
  }
  
  canUndo(): boolean {
    return this.past.length > 0;
  }
  
  canRedo(): boolean {
    return this.future.length > 0;
  }
  
  clear(): void {
    this.clearDebounce();
    this.past = [];
    this.present = '';
    this.future = [];
  }
  
  private clearDebounce(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}

// ============================================
// テスト例 (tests/NoteService.test.ts)
// ============================================

import { NoteService } from '../services/NoteService';
import { ValidationService } from '../services/ValidationService';
import { ErrorService } from '../services/ErrorService';
import { NoteRepository } from '../repositories/NoteRepository';
import { ErrorCode } from '../types';

describe('NoteService', () => {
  let noteService: NoteService;
  let mockRepository: jest.Mocked<NoteRepository>;
  let mockValidator: jest.Mocked<ValidationService>;
  let mockErrorService: jest.Mocked<ErrorService>;
  
  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getVersions: jest.fn(),
      restoreVersion: jest.fn(),
    };
    
    mockValidator = {
      validateNote: jest.fn(),
      validateTitle: jest.fn(),
    };
    
    mockErrorService = {
      handleError: jest.fn(),
    };
    
    noteService = new NoteService(
      mockRepository,
      mockValidator,
      mockErrorService
    );
  });
  
  describe('loadNote', () => {
    it('既存のノートを正常に読み込む', async () => {
      const mockNote = {
        id: 'note-1',
        title: 'Test Note',
        content: 'Test content',
        tags: [],
        path: '/',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };
      
      mockRepository.findById.mockResolvedValue(mockNote);
      
      const result = await noteService.loadNote('note-1');
      
      expect(result).toEqual(mockNote);
      expect(mockRepository.findById).toHaveBeenCalledWith('note-1');
    });
    
    it('ノートが見つからない場合はエラーを投げる', async () => {
      mockRepository.findById.mockResolvedValue(null);
      
      await expect(noteService.loadNote('non-existent')).rejects.toEqual({
        code: ErrorCode.NOT_FOUND,
        message: 'ノート(ID: non-existent)が見つかりませんでした。',
        recoverable: false,
      });
    });
    
    it('リポジトリエラーの場合はLOAD_FAILEDエラーを投げる', async () => {
      mockRepository.findById.mockRejectedValue(new Error('DB Error'));
      
      await expect(noteService.loadNote('note-1')).rejects.toMatchObject({
        code: ErrorCode.LOAD_FAILED,
        message: 'ノートの読み込みに失敗しました。',
        recoverable: true,
      });
    });
  });
  
  describe('save', () => {
    it('バリデーションエラーがある場合はエラーを投げる', async () => {
      mockValidator.validateNote.mockReturnValue([
        'タイトルは必須です',
        'コンテンツが長すぎます',
      ]);
      
      await expect(noteService.save({ title: '', content: 'x'.repeat(100001) }))
        .rejects.toEqual({
          code: ErrorCode.VALIDATION_ERROR,
          message: 'タイトルは必須です\nコンテンツが長すぎます',
          recoverable: false,
        });
      
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
    
    it('新規ノートを正常に作成する', async () => {
      const newNote = {
        title: 'New Note',
        content: 'New content',
        tags: [],
      };
      
      const createdNote = {
        id: 'new-note-id',
        ...newNote,
        path: '/',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };
      
      mockValidator.validateNote.mockReturnValue([]);
      mockRepository.create.mockResolvedValue(createdNote);
      
      const result = await noteService.save(newNote);
      
      expect(result).toEqual(createdNote);
      expect(mockRepository.create).toHaveBeenCalledWith(newNote);
    });
    
    it('既存ノートを正常に更新する', async () => {
      const updateData = {
        id: 'existing-note',
        title: 'Updated Title',
        content: 'Updated content',
      };
      
      const updatedNote = {
        ...updateData,
        tags: [],
        path: '/',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
        version: 2,
      };
      
      mockValidator.validateNote.mockReturnValue([]);
      mockRepository.update.mockResolvedValue(updatedNote);
      
      const result = await noteService.save(updateData);
      
      expect(result).toEqual(updatedNote);
      expect(mockRepository.update).toHaveBeenCalledWith('existing-note', updateData);
    });
  });
});

// ============================================
// Store のテスト例 (tests/NoteEditorStore.test.ts)
// ============================================

import { renderHook, act } from '@testing-library/react-hooks';
import { useNoteEditorStore } from '../stores/NoteEditorStore';
import { noteService } from '../services/NoteService';

// サービスのモック
jest.mock('../services/NoteService');

describe('NoteEditorStore', () => {
  beforeEach(() => {
    // ストアをリセット
    useNoteEditorStore.setState({
      note: null,
      content: '',
      title: '',
      isDirty: false,
      isLoading: false,
      isSaving: false,
      error: null,
      viewMode: 'edit',
      wordWrap: true,
      noteId: null,
      originalNote: null,
    });
  });
  
  describe('initialize', () => {
    it('既存ノートを初期化する', async () => {
      const mockNote = {
        id: 'note-1',
        title: 'Test Note',
        content: 'Test content',
        tags: [],
        path: '/',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };
      
      (noteService.loadNote as jest.Mock).mockResolvedValue(mockNote);
      
      const { result } = renderHook(() => useNoteEditorStore());
      
      await act(async () => {
        await result.current.initialize('note-1');
      });
      
      expect(result.current.note).toEqual(mockNote);
      expect(result.current.originalNote).toEqual(mockNote);
      expect(result.current.content).toBe('Test content');
      expect(result.current.title).toBe('Test Note');
      expect(result.current.isDirty).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
    
    it('新規ノート作成モードで初期化する', async () => {
      const { result } = renderHook(() => useNoteEditorStore());
      
      await act(async () => {
        await result.current.initialize();
      });
      
      expect(result.current.note).toBeNull();
      expect(result.current.originalNote).toBeNull();
      expect(result.current.content).toBe('');
      expect(result.current.title).toBe('');
      expect(result.current.isDirty).toBe(false);
    });
  });
  
  describe('setContent', () => {
    it('コンテンツを更新してdirtyフラグを設定する', () => {
      const { result } = renderHook(() => useNoteEditorStore());
      
      // 初期状態を設定
      useNoteEditorStore.setState({
        originalNote: {
          id: 'note-1',
          title: 'Original Title',
          content: 'Original content',
          tags: [],
          path: '/',
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
        title: 'Original Title',
        content: 'Original content',
      });
      
      act(() => {
        result.current.setContent('New content');
      });
      
      expect(result.current.content).toBe('New content');
      expect(result.current.isDirty).toBe(true);
    });
    
    it('元のコンテンツと同じ場合はdirtyフラグを解除する', () => {
      const { result } = renderHook(() => useNoteEditorStore());
      
      const originalContent = 'Original content';
      
      useNoteEditorStore.setState({
        originalNote: {
          id: 'note-1',
          title: 'Title',
          content: originalContent,
          tags: [],
          path: '/',
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
        title: 'Title',
        content: 'Modified content',
        isDirty: true,
      });
      
      act(() => {
        result.current.setContent(originalContent);
      });
      
      expect(result.current.isDirty).toBe(false);
    });
  });
});