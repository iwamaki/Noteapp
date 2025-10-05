## 🚀 最重要リファクタリング提案：イベント駆動アーキテクチャによるストア間依存の解消

現在最も致命的な問題である**ストア間の循環依存と複雑な状態同期**を解決する、統一的なイベントバスシステムの導入を提案します。

### 📋 提案の概要

**Event-Driven Architecture (EDA)** を導入し、ストア間の直接的な依存を完全に排除します。これにより、状態管理が予測可能になり、デバッグが容易になり、新機能の追加が簡単になります。

### 🛠 実装設計

```typescript
// app/services/eventBus.ts
type EventMap = {
  'note:created': { note: Note };
  'note:updated': { note: Note };
  'note:deleted': { noteId: string };
  'note:selected': { noteId: string | null };
  'notes:bulk-deleted': { noteIds: string[] };
  'notes:bulk-copied': { sourceIds: string[]; newNotes: Note[] };
  'draft:saved': { note: Note };
  'llm:command-received': { commands: LLMCommand[] };
  'llm:response-processed': { response: LLMResponse };
  'sync:requested': { source: string };
  'error:occurred': { error: AppError; context: string };
};

class EventBus {
  private listeners = new Map<keyof EventMap, Set<Function>>();
  private eventQueue: Array<{ type: keyof EventMap; payload: any }> = [];
  private isProcessing = false;

  on<K extends keyof EventMap>(
    event: K,
    handler: (payload: EventMap[K]) => void | Promise<void>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    // クリーンアップ関数を返す
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  async emit<K extends keyof EventMap>(
    event: K,
    payload: EventMap[K]
  ): Promise<void> {
    // イベントをキューに追加
    this.eventQueue.push({ type: event, payload });
    
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;
    
    while (this.eventQueue.length > 0) {
      const { type, payload } = this.eventQueue.shift()!;
      const handlers = this.listeners.get(type);
      
      if (handlers) {
        // 並列実行を避け、順次実行で予測可能性を確保
        for (const handler of handlers) {
          try {
            await handler(payload);
          } catch (error) {
            console.error(`Event handler error for ${type}:`, error);
            // エラーイベントを発火（無限ループ防止のため type !== 'error:occurred' をチェック）
            if (type !== 'error:occurred') {
              this.eventQueue.push({
                type: 'error:occurred',
                payload: { error, context: type }
              });
            }
          }
        }
      }
    }
    
    this.isProcessing = false;
  }

  // デバッグ用：現在のリスナー状況を確認
  getListenerStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.listeners.forEach((handlers, event) => {
      stats[event] = handlers.size;
    });
    return stats;
  }
}

export const eventBus = new EventBus();
```

### 📦 ストアのリファクタリング例

```typescript
// app/store/note/noteStore.ts - リファクタリング後
import { eventBus } from '../../services/eventBus';

interface NoteStoreState {
  notes: Note[];
  activeNote: Note | null;
  loading: LoadingState;
  error: NoteError | null;
  
  // アクション（他のストアに依存しない）
  setNotes: (notes: Note[]) => void;
  setActiveNote: (note: Note | null) => void;
  setLoading: (loading: LoadingState) => void;
  setError: (error: NoteError | null) => void;
}

export const useNoteStore = create<NoteStoreState>((set, get) => {
  // イベントリスナーの登録
  eventBus.on('note:created', ({ note }) => {
    const { notes } = get();
    set({ 
      notes: [...notes, note].sort((a, b) => 
        b.updatedAt.getTime() - a.updatedAt.getTime()
      ),
      activeNote: note
    });
  });

  eventBus.on('note:updated', ({ note }) => {
    const { notes, activeNote } = get();
    set({
      notes: notes.map(n => n.id === note.id ? note : n),
      activeNote: activeNote?.id === note.id ? note : activeNote
    });
  });

  eventBus.on('note:deleted', ({ noteId }) => {
    const { notes, activeNote } = get();
    set({
      notes: notes.filter(n => n.id !== noteId),
      activeNote: activeNote?.id === noteId ? null : activeNote
    });
  });

  return {
    notes: [],
    activeNote: null,
    loading: { isLoading: false },
    error: null,

    setNotes: (notes) => set({ notes }),
    setActiveNote: (note) => set({ activeNote: note }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
  };
});

// app/store/note/noteSelectionStore.ts - リファクタリング後
export const useNoteSelectionStore = create<NoteSelectionStoreState>((set, get) => ({
  isSelectionMode: false,
  selectedNoteIds: new Set<string>(),

  deleteSelectedNotes: async () => {
    const { selectedNoteIds } = get();
    
    try {
      // ストレージ層で削除を実行
      for (const noteId of selectedNoteIds) {
        await NoteStorageService.deleteNote(noteId);
      }
      
      // イベントを発火（他のストアが自動的に反応）
      await eventBus.emit('notes:bulk-deleted', { 
        noteIds: Array.from(selectedNoteIds) 
      });
      
      // 自身の状態をクリア
      set({
        selectedNoteIds: new Set<string>(),
        isSelectionMode: false
      });
    } catch (error) {
      await eventBus.emit('error:occurred', { 
        error, 
        context: 'bulk-delete' 
      });
    }
  },

  // 他のストアへの直接参照を削除
  copySelectedNotes: async () => {
    const { selectedNoteIds } = get();
    const sourceIds = Array.from(selectedNoteIds);
    
    try {
      // コピー処理をサービス層に委譲
      const newNotes = await NoteStorageService.copyNotes(sourceIds);
      
      // イベントを発火
      await eventBus.emit('notes:bulk-copied', { sourceIds, newNotes });
      
      set({
        selectedNoteIds: new Set<string>(),
        isSelectionMode: false
      });
    } catch (error) {
      await eventBus.emit('error:occurred', { 
        error, 
        context: 'bulk-copy' 
      });
    }
  },
}));
```

### 🔄 コマンドパターンの統合

```typescript
// app/services/commandExecutor.ts
interface Command {
  execute(): Promise<void>;
  undo?(): Promise<void>;
  redo?(): Promise<void>;
}

class UpdateNoteCommand implements Command {
  constructor(
    private noteId: string,
    private updates: Partial<Note>,
    private previousState?: Note
  ) {}

  async execute(): Promise<void> {
    const note = await NoteStorageService.updateNote({
      id: this.noteId,
      ...this.updates
    });
    await eventBus.emit('note:updated', { note });
  }

  async undo(): Promise<void> {
    if (this.previousState) {
      const note = await NoteStorageService.updateNote({
        id: this.noteId,
        ...this.previousState
      });
      await eventBus.emit('note:updated', { note });
    }
  }
}

class CommandExecutor {
  private history: Command[] = [];
  private currentIndex = -1;

  async execute(command: Command): Promise<void> {
    await command.execute();
    
    // 新しいコマンドを実行したら、現在位置より後の履歴を削除
    this.history = this.history.slice(0, this.currentIndex + 1);
    this.history.push(command);
    this.currentIndex++;
  }

  async undo(): Promise<void> {
    if (this.currentIndex >= 0 && this.history[this.currentIndex].undo) {
      await this.history[this.currentIndex].undo!();
      this.currentIndex--;
    }
  }

  async redo(): Promise<void> {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      await this.history[this.currentIndex].execute();
    }
  }
}

export const commandExecutor = new CommandExecutor();
```

### 🎯 フックの簡略化

```typescript
// app/hooks/useNoteOperations.ts
export const useNoteOperations = () => {
  const updateNote = useCallback(async (noteId: string, updates: Partial<Note>) => {
    const command = new UpdateNoteCommand(noteId, updates);
    await commandExecutor.execute(command);
  }, []);

  const createNote = useCallback(async (data: CreateNoteData) => {
    const note = await NoteStorageService.createNote(data);
    await eventBus.emit('note:created', { note });
    return note;
  }, []);

  const deleteNote = useCallback(async (noteId: string) => {
    await NoteStorageService.deleteNote(noteId);
    await eventBus.emit('note:deleted', { noteId });
  }, []);

  return { updateNote, createNote, deleteNote };
};
```

### 💡 メリット

1. **完全な疎結合**: ストア間の直接依存が完全に排除
2. **予測可能な状態変更**: イベントフローが明確で追跡可能
3. **優れたテスタビリティ**: 各ストアを独立してテスト可能
4. **拡張性**: 新機能追加時に既存コードの変更最小限
5. **デバッグ容易性**: イベントログで状態変更を完全追跡
6. **Undo/Redo機能**: コマンドパターンにより簡単に実装可能

### 📊 移行戦略

1. **Phase 1**: EventBusとCommandExecutorの実装（1日）
2. **Phase 2**: 1つのストア（noteStore）をリファクタリング（2日）
3. **Phase 3**: 残りのストアを順次移行（3日）
4. **Phase 4**: コンポーネントの更新とテスト（2日）

このアーキテクチャ変更により、現在の**循環依存**、**状態同期の複雑さ**、**メモリリーク**の問題が根本的に解決され、アプリケーションの**保守性**と**拡張性**が劇的に向上します。
