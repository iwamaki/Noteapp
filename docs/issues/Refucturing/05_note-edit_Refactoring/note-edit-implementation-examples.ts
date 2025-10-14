// ============================================
// 1. 統一された型定義 (types/index.ts)
// ============================================

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  path: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface EditorState {
  note: Note | null;
  content: string;
  title: string;
  isDirty: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: EditorError | null;
  viewMode: ViewMode;
  wordWrap: boolean;
}

export type ViewMode = 'edit' | 'preview' | 'diff';

export interface EditorError {
  code: ErrorCode;
  message: string;
  recoverable: boolean;
  retry?: () => Promise<void>;
}

export enum ErrorCode {
  SAVE_FAILED = 'SAVE_FAILED',
  LOAD_FAILED = 'LOAD_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
}

// ============================================
// 2. エラー処理サービス (services/ErrorService.ts)
// ============================================

import { Alert } from 'react-native';

export class ErrorService {
  private static instance: ErrorService;
  
  static getInstance(): ErrorService {
    if (!this.instance) {
      this.instance = new ErrorService();
    }
    return this.instance;
  }
  
  handleError(error: EditorError, options?: {
    showAlert?: boolean;
    onRetry?: () => void;
    onDismiss?: () => void;
  }): void {
    const { showAlert = true, onRetry, onDismiss } = options || {};
    
    if (!showAlert) return;
    
    const buttons: any[] = [
      {
        text: 'OK',
        onPress: onDismiss,
      },
    ];
    
    if (error.recoverable && onRetry) {
      buttons.unshift({
        text: 'リトライ',
        onPress: onRetry,
      });
    }
    
    Alert.alert(
      this.getErrorTitle(error.code),
      error.message,
      buttons
    );
  }
  
  private getErrorTitle(code: ErrorCode): string {
    switch (code) {
      case ErrorCode.SAVE_FAILED:
        return '保存エラー';
      case ErrorCode.LOAD_FAILED:
        return '読み込みエラー';
      case ErrorCode.NETWORK_ERROR:
        return 'ネットワークエラー';
      case ErrorCode.VALIDATION_ERROR:
        return '入力エラー';
      case ErrorCode.NOT_FOUND:
        return 'ノートが見つかりません';
      default:
        return 'エラー';
    }
  }
}

// ============================================
// 3. バリデーションサービス (services/ValidationService.ts)
// ============================================

export interface ValidationRule {
  field: string;
  validate: (value: any) => boolean;
  message: string;
}

export class ValidationService {
  private rules: ValidationRule[] = [
    {
      field: 'title',
      validate: (value: string) => value && value.trim().length > 0,
      message: 'タイトルは必須です',
    },
    {
      field: 'title',
      validate: (value: string) => !value || value.length <= 100,
      message: 'タイトルは100文字以内で入力してください',
    },
    {
      field: 'content',
      validate: (value: string) => !value || value.length <= 100000,
      message: 'コンテンツは100,000文字以内で入力してください',
    },
  ];
  
  validateNote(data: Partial<Note>): string[] {
    const errors: string[] = [];
    
    for (const rule of this.rules) {
      const value = data[rule.field as keyof Note];
      if (!rule.validate(value)) {
        errors.push(rule.message);
      }
    }
    
    return errors;
  }
  
  validateTitle(title: string): string | null {
    const titleRules = this.rules.filter(r => r.field === 'title');
    
    for (const rule of titleRules) {
      if (!rule.validate(title)) {
        return rule.message;
      }
    }
    
    return null;
  }
}

// ============================================
// 4. 自動保存フック (hooks/useAutoSave.ts)
// ============================================

import { useEffect, useRef } from 'react';

interface UseAutoSaveOptions {
  enabled?: boolean;
  delay?: number;
  onSave: () => Promise<void>;
  isDirty: boolean;
}

export const useAutoSave = ({
  enabled = true,
  delay = 5000,
  onSave,
  isDirty,
}: UseAutoSaveOptions) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  
  useEffect(() => {
    if (!enabled || !isDirty) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    
    // 既存のタイマーをクリア
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    // 新しいタイマーをセット
    timerRef.current = setTimeout(async () => {
      if (!isSavingRef.current) {
        isSavingRef.current = true;
        try {
          await onSave();
        } finally {
          isSavingRef.current = false;
        }
      }
    }, delay);
    
    // クリーンアップ
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [enabled, delay, onSave, isDirty]);
  
  // 手動での即座の保存
  const saveNow = async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    if (!isSavingRef.current && isDirty) {
      isSavingRef.current = true;
      try {
        await onSave();
      } finally {
        isSavingRef.current = false;
      }
    }
  };
  
  return { saveNow };
};

// ============================================
// 5. キーボードショートカット (hooks/useKeyboardShortcuts.ts)
// ============================================

import { useEffect } from 'react';
import { Keyboard, Platform } from 'react-native';

interface Shortcuts {
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onFind?: () => void;
  onReplace?: () => void;
}

export const useKeyboardShortcuts = (shortcuts: Shortcuts) => {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      
      if (isMeta) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            shortcuts.onSave?.();
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              shortcuts.onRedo?.();
            } else {
              shortcuts.onUndo?.();
            }
            break;
          case 'f':
            e.preventDefault();
            shortcuts.onFind?.();
            break;
          case 'h':
            e.preventDefault();
            shortcuts.onReplace?.();
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
};

// ============================================
// 6. 未保存警告フック (hooks/useUnsavedChangesWarning.ts)
// ============================================

import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';

export const useUnsavedChangesWarning = (isDirty: boolean) => {
  const navigation = useNavigation();
  
  useEffect(() => {
    if (!isDirty) return;
    
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      e.preventDefault();
      
      Alert.alert(
        '変更を破棄しますか？',
        '保存されていない変更があります。',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '破棄',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });
    
    return unsubscribe;
  }, [navigation, isDirty]);
  
  // ブラウザの場合の警告
  useEffect(() => {
    if (!isDirty) return;
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);
};

// ============================================
// 7. デバウンスユーティリティ (utils/debounce.ts)
// ============================================

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

// ============================================
// 8. リポジトリインターフェース (repositories/NoteRepository.ts)
// ============================================

export interface NoteRepository {
  findById(id: string): Promise<Note | null>;
  findAll(): Promise<Note[]>;
  create(data: CreateNoteData): Promise<Note>;
  update(id: string, data: UpdateNoteData): Promise<Note>;
  delete(id: string): Promise<void>;
  getVersions(noteId: string): Promise<NoteVersion[]>;
  restoreVersion(noteId: string, versionId: string): Promise<Note>;
}

// Dependency Injection用のトークン
export const NOTE_REPOSITORY_TOKEN = Symbol('NoteRepository');

// ============================================
// 9. テスト可能なサービス実装例
// ============================================

export class NoteService {
  constructor(
    private repository: NoteRepository,
    private validator: ValidationService,
    private errorService: ErrorService
  ) {}
  
  async loadNote(id: string): Promise<Note> {
    try {
      const note = await this.repository.findById(id);
      
      if (!note) {
        throw {
          code: ErrorCode.NOT_FOUND,
          message: `ノート(ID: ${id})が見つかりませんでした。`,
          recoverable: false,
        };
      }
      
      return note;
    } catch (error) {
      if (error.code) {
        throw error;
      }
      
      throw {
        code: ErrorCode.LOAD_FAILED,
        message: 'ノートの読み込みに失敗しました。',
        recoverable: true,
        retry: () => this.loadNote(id),
      };
    }
  }
  
  async save(data: Partial<Note>): Promise<Note> {
    // バリデーション
    const errors = this.validator.validateNote(data);
    if (errors.length > 0) {
      throw {
        code: ErrorCode.VALIDATION_ERROR,
        message: errors.join('\n'),
        recoverable: false,
      };
    }
    
    try {
      if (data.id) {
        return await this.repository.update(data.id, data);
      } else {
        return await this.repository.create(data as CreateNoteData);
      }
    } catch (error) {
      throw {
        code: ErrorCode.SAVE_FAILED,
        message: 'ノートの保存に失敗しました。',
        recoverable: true,
        retry: () => this.save(data),
      };
    }
  }
}