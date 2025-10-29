# note-edit フォルダ リファクタリング実装計画

## 📁 新しいフォルダ構造

```
app/screen/note-edit/
├── NoteEditScreen.tsx                 # メイン画面（薄いプレゼンテーション層）
├── types/
│   ├── index.ts                      # 型定義の集約
│   ├── editor.types.ts               # エディタ関連の型
│   └── storage.types.ts              # ストレージ関連の型
├── stores/
│   ├── NoteEditorStore.ts            # 状態管理（Zustand/Jotai）
│   └── HistoryStore.ts               # 履歴管理の独立Store
├── services/
│   ├── NoteService.ts                # ビジネスロジック層
│   ├── ValidationService.ts          # バリデーション
│   └── DiffService.ts                # 差分計算ロジック
├── repositories/
│   ├── NoteRepository.ts             # データアクセス層のインターフェース
│   └── AsyncStorageNoteRepository.ts # 実装
├── hooks/
│   ├── useNoteEditor.ts              # 薄いフックファサード
│   ├── useAutoSave.ts                # 自動保存専用
│   ├── useKeyboardShortcuts.ts       # キーボードショートカット
│   └── useUnsavedChangesWarning.ts   # 未保存警告
├── components/
│   ├── NoteEditContainer.tsx         # コンテナコンポーネント
│   ├── header/
│   │   ├── NoteEditHeader.tsx
│   │   ├── HeaderActions.tsx
│   │   └── TitleInput.tsx
│   ├── editor/
│   │   ├── EditorContainer.tsx
│   │   ├── TextEditor.tsx
│   │   ├── MarkdownPreview.tsx
│   │   └── EditorToolbar.tsx
│   └── modals/
│       ├── UnsavedChangesModal.tsx
│       └── VersionHistoryModal.tsx
└── utils/
    ├── debounce.ts
    ├── diff.ts
    └── validators.ts
```

## 🏗️ 実装詳細

### 1. 型定義の統一化 (`types/editor.types.ts`)

```typescript
// エディタの状態を表す型
export interface EditorState {
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
}

export enum ErrorCode {
  SAVE_FAILED = 'SAVE_FAILED',
  LOAD_FAILED = 'LOAD_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

// 履歴管理の型
export interface HistoryState {
  past: string[];
  present: string;
  future: string[];
  maxSize: number;
}

// エディタのアクション
export interface EditorActions {
  setContent: (content: string) => void;
  setTitle: (title: string) => void;
  save: () => Promise<void>;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  toggleWordWrap: () => void;
  setViewMode: (mode: ViewMode) => void;
}
```

### 2. 状態管理の統一化 (`stores/NoteEditorStore.ts`)

```typescript
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { EditorState, EditorActions } from '../types';
import { NoteService } from '../services/NoteService';
import { HistoryStore } from './HistoryStore';

interface NoteEditorStore extends EditorState, EditorActions {
  noteId: string | null;
  originalNote: Note | null;
  
  // 初期化
  initialize: (noteId?: string) => Promise<void>;
  
  // 自動保存のトリガー
  triggerAutoSave: () => void;
  
  // クリーンアップ
  cleanup: () => void;
}

export const useNoteEditorStore = create<NoteEditorStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // 初期状態
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
      
      // アクション実装
      setContent: (content) => {
        const { originalNote } = get();
        set({
          content,
          isDirty: content !== originalNote?.content,
        });
        HistoryStore.push(content);
      },
      
      setTitle: (title) => {
        const { originalNote } = get();
        set({
          title,
          isDirty: title !== originalNote?.title,
        });
      },
      
      save: async () => {
        const { noteId, title, content } = get();
        set({ isSaving: true, error: null });
        
        try {
          const savedNote = await NoteService.save({
            id: noteId,
            title,
            content,
          });
          
          set({
            isSaving: false,
            isDirty: false,
            originalNote: savedNote,
            noteId: savedNote.id,
          });
        } catch (error) {
          set({
            isSaving: false,
            error: {
              code: ErrorCode.SAVE_FAILED,
              message: error.message,
              recoverable: true,
            },
          });
        }
      },
      
      // その他のアクション...
    }))
  )
);
```

### 3. ビジネスロジックの分離 (`services/NoteService.ts`)

```typescript
import { NoteRepository } from '../repositories/NoteRepository';
import { ValidationService } from './ValidationService';
import { DiffService } from './DiffService';

export class NoteService {
  constructor(
    private repository: NoteRepository,
    private validator: ValidationService,
    private diffService: DiffService
  ) {}
  
  async loadNote(id: string): Promise<Note> {
    const note = await this.repository.findById(id);
    if (!note) {
      throw new NoteNotFoundError(id);
    }
    return note;
  }
  
  async save(data: SaveNoteData): Promise<Note> {
    // バリデーション
    const errors = this.validator.validateNote(data);
    if (errors.length > 0) {
      throw new ValidationError(errors);
    }
    
    // 新規作成 or 更新の判定
    if (data.id) {
      return this.repository.update(data.id, data);
    } else {
      return this.repository.create(data);
    }
  }
  
  async calculateDiff(original: string, current: string): DiffResult {
    return this.diffService.calculate(original, current);
  }
  
  async getVersionHistory(noteId: string): Promise<NoteVersion[]> {
    return this.repository.getVersions(noteId);
  }
  
  async restoreVersion(noteId: string, versionId: string): Promise<Note> {
    return this.repository.restoreVersion(noteId, versionId);
  }
}

// シングルトンインスタンス
export const noteService = new NoteService(
  new AsyncStorageNoteRepository(),
  new ValidationService(),
  new DiffService()
);
```

### 4. 履歴管理の独立化 (`stores/HistoryStore.ts`)

```typescript
class HistoryManager {
  private history: string[] = [];
  private currentIndex = -1;
  private maxSize = 100;
  private debounceTimer: NodeJS.Timeout | null = null;
  
  push(content: string, debounceMs = 300): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.addToHistory(content);
    }, debounceMs);
  }
  
  private addToHistory(content: string): void {
    // 現在位置より後の履歴を削除
    this.history = this.history.slice(0, this.currentIndex + 1);
    
    // 重複チェック
    if (this.history[this.currentIndex] === content) {
      return;
    }
    
    // 履歴に追加
    this.history.push(content);
    this.currentIndex++;
    
    // サイズ制限
    if (this.history.length > this.maxSize) {
      this.history.shift();
      this.currentIndex--;
    }
  }
  
  undo(): string | null {
    if (this.canUndo()) {
      this.currentIndex--;
      return this.history[this.currentIndex];
    }
    return null;
  }
  
  redo(): string | null {
    if (this.canRedo()) {
      this.currentIndex++;
      return this.history[this.currentIndex];
    }
    return null;
  }
  
  canUndo(): boolean {
    return this.currentIndex > 0;
  }
  
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }
  
  reset(initialContent: string): void {
    this.history = [initialContent];
    this.currentIndex = 0;
  }
  
  clear(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.history = [];
    this.currentIndex = -1;
  }
}

export const HistoryStore = new HistoryManager();
```

### 5. フックの簡略化 (`hooks/useNoteEditor.ts`)

```typescript
import { useEffect } from 'react';
import { useNoteEditorStore } from '../stores/NoteEditorStore';
import { useAutoSave } from './useAutoSave';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useUnsavedChangesWarning } from './useUnsavedChangesWarning';

export const useNoteEditor = (noteId?: string) => {
  const store = useNoteEditorStore();
  
  // 初期化
  useEffect(() => {
    store.initialize(noteId);
    
    return () => {
      store.cleanup();
    };
  }, [noteId]);
  
  // 機能の組み合わせ
  useAutoSave(store.isDirty, store.save);
  useKeyboardShortcuts({
    onSave: store.save,
    onUndo: store.undo,
    onRedo: store.redo,
  });
  useUnsavedChangesWarning(store.isDirty);
  
  // シンプルなインターフェースを返す
  return {
    // 状態
    ...store,
    
    // よく使うアクションのみ露出
    setContent: store.setContent,
    setTitle: store.setTitle,
    save: store.save,
    undo: store.undo,
    redo: store.redo,
  };
};
```

### 6. 画面コンポーネントの簡略化 (`NoteEditScreen.tsx`)

```typescript
import React from 'react';
import { useRoute } from '@react-navigation/native';
import { NoteEditContainer } from './components/NoteEditContainer';
import { useNoteEditor } from './hooks/useNoteEditor';
import { MainContainer } from '../../components/MainContainer';

function NoteEditScreen() {
  const route = useRoute();
  const { noteId } = route.params || {};
  const editor = useNoteEditor(noteId);
  
  return (
    <MainContainer isLoading={editor.isLoading}>
      <NoteEditContainer {...editor} />
    </MainContainer>
  );
}

export default NoteEditScreen;
```

## 🔄 段階的な移行計画

### Phase 1: 型定義の統一（1-2日）
1. `types/`フォルダを作成し、全ての型定義を移動
2. 既存コードの型を統一された型に置き換え

### Phase 2: サービス層の導入（2-3日）
1. `NoteService`を作成し、ビジネスロジックを移動
2. `ValidationService`と`DiffService`を追加
3. リポジトリパターンでデータアクセス層を抽象化

### Phase 3: 状態管理の統一（3-4日）
1. Zustandを導入し、`NoteEditorStore`を実装
2. 履歴管理を`HistoryStore`として独立
3. 既存のuseState/useReducerを段階的に置き換え

### Phase 4: フックの再構成（2-3日）
1. 単一責任の小さなフックに分割
2. `useNoteEditor`をファサードとして再実装
3. テストを追加

### Phase 5: UIコンポーネントの整理（2-3日）
1. コンポーネントを機能別にフォルダ分け
2. プレゼンテーション/コンテナの分離
3. 共通コンポーネントの抽出

## 📊 期待される効果

### 保守性の向上
- **責任の明確化**: 各モジュールが単一の責任を持つ
- **テスタビリティ**: ビジネスロジックを独立してテスト可能
- **型安全性**: 統一された型定義による安全性向上

### 拡張性の向上
- **機能追加が容易**: 新機能を独立したサービス/フックとして追加
- **差し替え可能**: リポジトリパターンによりストレージ層を容易に変更可能
- **再利用性**: 小さなフックやサービスを他の画面で再利用

### パフォーマンス改善
- **レンダリング最適化**: 状態管理の統一により不要な再レンダリングを削減
- **メモリ効率**: 履歴管理のサイズ制限と効率的な実装

## 🎯 優先度の高い改善項目

1. **型定義の統一化** - 即座に実施可能で影響が大きい
2. **履歴管理の独立化** - 複雑なロジックを隔離
3. **エラー処理の統一化** - UXの一貫性向上
4. **ビジネスロジックの分離** - テスタビリティの向上
5. **状態管理の統一化** - 長期的な保守性向上