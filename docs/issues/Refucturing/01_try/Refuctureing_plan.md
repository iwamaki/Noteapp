# Noteapp/app/ 総合リファクタリング計画

## 15. 全体構造の分析まとめ

### アーキテクチャ図:
```
app/
├── index.ts (エントリーポイント)
├── App.tsx (ルートコンポーネント)
│
├── navigation/
│   ├── types.ts (ナビゲーション型定義) ✅
│   └── RootNavigator.tsx (画面スタック) ✅
│
├── store/ (状態管理層)
│   ├── index.ts (空) ❌
│   ├── noteStore.ts (415行 - 肥大化) ⚠️
│   └── settingsStore.ts (未使用項目多数) ⚠️
│
├── services/ (ビジネスロジック層)
│   ├── storageService.ts (AsyncStorage管理) ✅
│   ├── diffService.ts (差分計算) ✅
│   ├── llmService.ts (LLM連携 - 複雑) ⚠️
│   └── api.ts (薄いラッパー) ⚠️
│
├── hooks/ (ロジック再利用層)
│   ├── useDiffManager.ts ✅
│   └── useLLMCommandHandler.ts (複雑) ⚠️
│
├── components/ (共通UI層)
│   ├── CustomHeader.tsx (コンポーネント未使用) ⚠️
│   ├── HeaderButton.tsx ✅
│   ├── ListItem.tsx ✅
│   └── FabButton.tsx ✅
│
├── features/ (機能モジュール層)
│   ├── note-list/
│   │   ├── NoteListScreen.tsx ✅
│   │   └── hooks/useNotes.ts (空) ❌
│   ├── note-edit/
│   │   ├── NoteEditScreen.tsx ✅
│   │   ├── hooks/useNoteEditor.ts ✅
│   │   └── components/
│   │       ├── FileEditor.tsx (責任肥大化) ⚠️
│   │       └── __tests__/FileEditor.test.tsx ✅
│   ├── diff-view/
│   │   ├── DiffViewScreen.tsx ✅
│   │   └── components/DiffViewer.tsx (最適化不足) ⚠️
│   ├── version-history/
│   │   └── VersionHistoryScreen.tsx ✅
│   ├── chat/
│   │   ├── ChatInputBar.tsx (複雑) ⚠️
│   │   ├── hooks/useChat.ts ✅
│   │   └── components/ChatButton.tsx (未使用) ❌
│   └── settings/
│       └── SettingsScreen.tsx (未実装多数) ❌
│
├── utils/
│   ├── commonStyles.ts ✅
│   ├── constants.ts (再エクスポートのみ) ✅
│   └── formatUtils.ts (空) ❌
│
└── types/
    ├── index.ts (空) ❌
    ├── api.ts (再エクスポート) ⚠️
    └── note.ts (再エクスポート) ⚠️
```

### ファイル統計:
```
総ファイル数: 37
空ファイル: 5 (13.5%)
問題あり: 15 (40.5%)
良好: 17 (46.0%)
```

---

## 16. 総合リファクタリング計画


### ！完了 フェーズ1 完了！

---

### フェーズ2: 構造改善（優先度: 🟡 中）
**目的**: コードの保守性と拡張性を向上

#### ！完了 2.1 noteStoreの分割 完了！

---

#### 2.2 設定とサービスの連携
**問題**: settingsStoreの設定が実際に適用されていない



#### 2.3 LLMコマンドの完全実装
**問題**: `edit_file`コマンドのみ実装、他の9種類が未実装

**実装計画**:
```typescript
// app/hooks/useLLMCommandHandler.ts

// 実装すべきコマンド:
const commandHandlers = {
  'edit_file': executeEditFileCommand,           // ✅ 実装済み
  'create_file': executeCreateFileCommand,       // ❌ 未実装 → ノート作成
  'delete_file': executeDeleteFileCommand,       // ❌ 未実装 → ノート削除
  'copy_file': executeCopyFileCommand,           // ❌ 未実装 → ノート複製
  'move_file': executeMoveFileCommand,           // ❌ 未実装 → 優先度低
  'read_file': executeReadFileCommand,           // ❌ 未実装 → ノート読み込み
  'list_files': executeListFilesCommand,         // ❌ 未実装 → 一覧表示
  'batch_delete': executeBatchDeleteCommand,     // ❌ 未実装 → 複数削除
  'batch_copy': executeBatchCopyCommand,         // ❌ 未実装 → 複数複製
  'batch_move': executeBatchMoveCommand,         // ❌ 未実装 → 優先度低
};

// ノートアプリとしての優先順位:
// 優先度高: create_file, delete_file, read_file, list_files
// 優先度中: copy_file, batch_delete, batch_copy
// 優先度低: move_file, batch_move (ファイルシステムの概念がないが、一応))
```

**実装手順**:
1. 優先度高のコマンドから実装
2. 各コマンドに対応するストアアクションを呼び出す
3. エラーハンドリングを統一
4. ユーザーへのフィードバック（トースト通知など）を追加

**期待される効果**:
- LLMによる完全な操作が可能に
- AI機能の価値向上

**リスク**: 低（既存機能を呼び出すだけ）

---

#### 2.4 チャット履歴の永続化
**問題**: メッセージが画面アンマウント時に消える

**実装計画**:
```typescript
// app/store/chatStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ChatStore {
  conversations: Record<string, ChatMessage[]>;  // noteId → messages
  addMessage: (noteId: string, message: ChatMessage) => void;
  getMessages: (noteId: string) => ChatMessage[];
  clearMessages: (noteId: string) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      conversations: {},
      
      addMessage: (noteId, message) => {
        set(state => ({
          conversations: {
            ...state.conversations,
            [noteId]: [...(state.conversations[noteId] || []), message]
          }
        }));
      },
      
      getMessages: (noteId) => {
        return get().conversations[noteId] || [];
      },
      
      clearMessages: (noteId) => {
        set(state => {
          const { [noteId]: _, ...rest } = state.conversations;
          return { conversations: rest };
        });
      }
    }),
    {
      name: 'chat-storage',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
```

**useChatフックの更新**:
```typescript
// app/features/chat/hooks/useChat.ts
export const useChat = (context: ChatContext, noteId?: string) => {
  const chatStore = useChatStore();
  const [isLoading, setIsLoading] = useState(false);
  
  // ストアからメッセージを取得
  const messages = noteId ? chatStore.getMessages(noteId) : [];
  
  const sendMessage = async (inputText: string) => {
    const userMessage = createMessage('user', inputText);
    if (noteId) {
      chatStore.addMessage(noteId, userMessage);
    }
    // ... 残りの処理
  };
  
  return { messages, isLoading, sendMessage };
};
```

**期待される効果**:
- チャット履歴の永続化
- ノートごとに独立した会話履歴
- ユーザー体験の向上

**リスク**: 低

---

### フェーズ3: パフォーマンス最適化（優先度: 🟢 低）
**目的**: アプリケーションの速度とメモリ効率を向上

#### 3.1 FlatListへの移行
**対象コンポーネント**:
- `DiffViewer.tsx`: ScrollView → FlatList
- `ChatInputBar.tsx`: messages.map → FlatList

**実装例**:
```typescript
// app/features/diff-view/components/DiffViewer.tsx (改善後)
export const DiffViewer: React.FC<DiffViewerProps> = ({ diff, ... }) => {
  const renderItem = useCallback(({ item, index }: { item: DiffLine; index: number }) => {
    return renderDiffLine(item, index);
  }, [selectedBlocks, onBlockToggle, isReadOnly]);
  
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: ITEM_HEIGHT,  // 各行の高さを固定
    offset: ITEM_HEIGHT * index,
    index
  }), []);
  
  return (
    <FlatList
      data={diff}
      renderItem={renderItem}
      keyExtractor={(item, index) => `${item.type}-${index}`}
      getItemLayout={getItemLayout}
      initialNumToRender={20}
      maxToRenderPerBatch={10}
      windowSize={21}
      removeClippedSubviews={true}
      style={styles.diffContainer}
    />
  );
};
```

**期待される効果**:
- 大きな差分でもスムーズなスクロール
- メモリ使用量の削減
- 初期レンダリング時間の短縮

**リスク**: 低

---

#### 3.2 storageServiceのキャッシング
**問題**: 毎回AsyncStorageから全データをロード

**実装計画**:
```typescript
// app/services/storageService.ts (改善版)
export class NoteStorageService {
  private static notesCache: Note[] | null = null;
  private static lastFetchTime: number = 0;
  private static CACHE_TTL = 5000; // 5秒間キャッシュ有効
  
  private static async getAllNotesRaw(): Promise<Note[]> {
    const now = Date.now();
    
    // キャッシュが有効なら返す
    if (this.notesCache && (now - this.lastFetchTime) < this.CACHE_TTL) {
      return this.notesCache;
    }
    
    // キャッシュが無効なら再取得
    const jsonValue = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
    const notes = await StorageUtils.safeJsonParse<any[]>(jsonValue);
    
    this.notesCache = notes ? notes.map(note => StorageUtils.convertDates(note)) : [];
    this.lastFetchTime = now;
    
    return this.notesCache;
  }
  
  private static invalidateCache(): void {
    this.notesCache = null;
    this.lastFetchTime = 0;
  }
  
  static async createNote(data: CreateNoteData): Promise<Note> {
    const newNote = await this.createNoteLogic(data);
    this.invalidateCache();  // キャッシュ無効化
    return newNote;
  }
  
  // updateNote, deleteNote でも同様にキャッシュ無効化
}
```

**期待される効果**:
- 連続したノート取得が高速化
- AsyncStorageへのアクセス回数削減

**リスク**: 低（キャッシュ無効化ロジックの実装漏れに注意）

---

#### 3.3 差分計算アルゴリズムの改善
**問題**: O(m*n)の時間・空間計算量

**検討事項**:
```typescript
// 現在: 完全なLCSアルゴリズム（O(m*n)）

// 代替案:
// 1. Myers' diff algorithm (Gitで使用) - より高速
// 2. 外部ライブラリの使用:
//    - fast-diff
//    - diff (npmパッケージ)

// 実装例:
import * as Diff from 'diff';

export const generateDiff = (originalText: string, newText: string): DiffLine[] => {
  const changes = Diff.diffLines(originalText, newText);
  
  // Diffライブラリの出力をDiffLine形式に変換
  // ...
};
```

**期待される効果**:
- 大きなファイルでの差分計算が高速化
- メモリ使用量の削減

**リスク**: 中（アルゴリズム変更によるバグのリスク、十分なテストが必要）

---

### フェーズ4: ユーザー体験向上（優先度: 🟢 低）
**目的**: 使いやすさとアクセシビリティの向上

#### 4.1 アクセシビリティ対応
**対象**: 全コンポーネント

**実装チェックリスト**:
```typescript
// 各コンポーネントで対応すべき項目
✅ accessibilityLabel の設定
✅ accessibilityHint の設定（必要に応じて）
✅ accessibilityRole の設定
✅ accessibilityState の設定（選択状態など）
✅ タッチターゲットサイズの確保（44x44px以上）
✅ フォーカス順序の最適化
✅ スクリーンリーダーでの動作確認

// 実装例: ListItem.tsx
<TouchableOpacity
  style={styles.container}
  onPress={onPress}
  accessibilityRole="button"
  accessibilityLabel={title}
  accessibilityHint={isSelectionMode ? "ノートを選択または選択解除します" : "ノートを開いて編集します"}
  accessibilityState={{
    selected: isSelected,
    disabled: disabled
  }}
>
  {/* ... */}
</TouchableOpacity>
```

**期待される効果**:
- 視覚障害者の利用が可能に
- アプリストアでの評価向上
- より広いユーザー層へのリーチ

**リスク**: なし

---

#### 4.2 エラー表示の統一
**問題**: 画面ごとにエラー表示方法が異なる

**実装計画**:
```typescript
// app/components/ErrorBoundary.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>エラーが発生しました</Text>
          <Text style={styles.message}>{this.state.error?.message}</Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.buttonText}>再試行</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return this.props.children;
  }
}

// app/components/ErrorDisplay.tsx
export function ErrorDisplay({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorText}>{error}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>再試行</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

**App.tsxの更新**:
```typescript
export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <RootNavigator />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
```

**各画面での使用**:
```typescript
// NoteListScreen.tsx
if (error) {
  return <ErrorDisplay error={error.message} onRetry={fetchNotes} />;
}
```

**期待される効果**:
- エラー表示の統一
- ユーザーフレンドリーなエラーメッセージ
- クラッシュの防止

**リスク**: 低

---

#### 4.3 ローディング状態の改善
**実装計画**:
```typescript
// app/components/LoadingOverlay.tsx
import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Modal } from 'react-native';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export function LoadingOverlay({ visible, message = '読み込み中...' }: LoadingOverlayProps) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
}

// 使用例
function NoteEditScreen() {
  const { isLoading } = useNoteEditor(noteId);
  
  return (
    <View style={styles.container}>
      {/* ... */}
      <LoadingOverlay visible={isLoading} message="ノートを読み込んでいます..." />
    </View>
  );
}
```

**期待される効果**:
- ローディング状態の視覚的フィードバック
- ユーザーの待ち時間に対する不安軽減

**リスク**: なし

---

### フェーズ5: テスト整備（優先度: 🟡 中）
**目的**: コードの品質と保守性を保証

#### 5.1 ユニットテストの追加
**現状**: `FileEditor.test.tsx`のみ

**追加すべきテスト**:
```typescript
// ストア層
store/noteStore.test.ts
store/noteDraftStore.test.ts
store/noteSelectionStore.test.ts
store/settingsStore.test.ts

// サービス層
services/storageService.test.ts
services/diffService.test.ts
services/llmService.test.ts

// フック層
hooks/useDiffManager.test.ts
hooks/useLLMCommandHandler.test.ts
hooks/useNoteEditor.test.ts

// コンポーネント層
components/ListItem.test.tsx
components/FabButton.test.tsx
components/DiffViewer.test.tsx
```

**テスト実装例**:
```typescript
// store/noteStore.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useNoteStore } from './noteStore';

describe('noteStore', () => {
  beforeEach(() => {
    // ストアをリセット
    useNoteStore.setState({
      notes: [],
      activeNote: null,
      loading: { isLoading: false }
    });
  });
  
  it('should fetch notes', async () => {
    const { result } = renderHook(() => useNoteStore());
    
    await act(async () => {
      await result.current.fetchNotes();
    });
    
    expect(result.current.notes.length).toBeGreaterThan(0);
    expect(result.current.loading.isLoading).toBe(false);
  });
  
  it('should create a note', async () => {
    const { result } = renderHook(() => useNoteStore());
    
    const newNote = await act(async () => {
      return await result.current.createNote({
        title: 'Test Note',
        content: 'Test Content'
      });
    });
    
    expect(newNote).toBeDefined();
    expect(newNote.title).toBe('Test Note');
    expect(result.current.notes).toContain(newNote);
  });
});
```

**期待される効果**:
- リグレッションの防止
- リファクタリングの安全性向上
- コードの信頼性向上

**リスク**: なし（時間がかかるが、長期的には必須）

---

#### 5.2 E2Eテストの追加
**ツール**: Detox または Maestro

**テストシナリオ**:
```typescript
// e2e/noteCreation.e2e.js
describe('Note Creation Flow', () => {
  it('should create a new note', async () => {
    await element(by.id('fab-button')).tap();
    await element(by.id('note-title-input')).typeText('My First Note');
    await element(by.id('note-content-input')).typeText('This is the content');
    await element(by.text('保存')).tap();
    await expect(element(by.text('My First Note'))).toBeVisible();
  });
});

// e2e/diffView.e2e.js
describe('Diff View Flow', () => {
  it('should show diff and apply changes', async () => {
    await element(by.text('Test Note')).tap();
    await element(by.id('note-content-input')).clearText();
    await element(by.id('note-content-input')).typeText('Updated content');
    await element(by.text('保存')).tap();
    
    // 差分画面が表示される
    await expect(element(by.text('Apply Changes'))).toBeVisible();
    
    // 変更を適用
    await element(by.text('適用')).tap();
    await expect(element(by.text('Updated content'))).toBeVisible();
  });
});
```

**期待される効果**:
- ユーザーフローの動作保証
- クリティカルなバグの早期発見

**リスク**: 中（E2Eテストのセットアップが複雑）

---

## 17. リファクタリング実施の優先順位マトリクス

```
         │ 影響度: 高      │ 影響度: 中      │ 影響度: 低
─────────┼─────────────────┼─────────────────┼─────────────────
緊急度: │ 🔴 フェーズ1    │ 🟡 フェーズ2    │ 🟢 フェーズ4
  高    │ - デッドコード  │ - noteStore分割 │ - a11y対応
        │ - デバッグコード│ - テーマ連携    │ - エラー統一
        │ - 設定画面整理  │                 │
─────────┼─────────────────┼─────────────────┼─────────────────
緊急度: │ 🟡 フェーズ2    │ 🟡 フェーズ2    │ 🟢 フェーズ3
  中    │ - LLMコマンド   │ - チャット永続化│ - FlatList移行
        │   実装          │                 │ - キャッシング
─────────┼─────────────────┼─────────────────┼─────────────────
緊急度: │ 🟢 フェーズ5    │ 🟢 フェーズ5    │ 🟢 フェーズ3
  低    │ - テスト整備    │ - E2Eテスト     │ - 差分アルゴリズム
        │                 │                 │   改善
```

---

## 18. 実装スケジュール（推奨）

### Week 1-2: 🔴 フェーズ1 (緊急対応)
- [x] デッドコード削除（1日）
- [x] デバッグコード削除とloggerユーティリティ作成（2日）
- [x] 設定画面の最小化（1日）
- [x] コードレビューと動作確認（1日）

### Week 3-4: 🟡 フェーズ2 (構造改善 - Part 1)
- [x] noteStoreの分割設計（1日）
- [x] noteStore分割実装（3日）
- [x] 既存コードの移行とテスト（2日）
- [x] コードレビューと統合テスト（1日）

### Week 5-6: 🟡 フェーズ2 (構造改善 - Part 2)
- [x] テーマシステムの実装（2日）
- [x] 各コンポーネントでuseTheme適用（3日）
- [x] ダークモード対応（2日）

### Week 7-8: 🟡 フェーズ2 (構造改善 - Part 3)
- [ ] LLMコマンド実装（優先度高から）（4日）
- [ ] チャット履歴の永続化（2日）
- [ ] 統合テスト（1日）

### Week 9-10: 🟢 フェーズ3 (パフォーマンス最適化)
- [ ] FlatListへの移行（3日）
- [ ] storageServiceキャッシング（2日）
- [ ] パフォーマンス測定とチューニング（2日）

### Week 11-12: 🟢 フェーズ4 (UX向上)
- [ ] アクセシビリティ対応（4日）
- [ ] エラー表示統一（2日）
- [ ] ローディング改善（1日）

### Week 13-14: 🟡 フェーズ5 (テスト整備)
- [ ] ユニットテストの追加（5日）
- [ ] E2Eテストのセットアップと実装（2日）

---

## 19. リスク管理

### 高リスク項目:
1. **noteStoreの分割**
   - リスク: 既存コードの大規模変更
   - 軽減策: 段階的な移行、十分なテストカバレッジ

2. **テーマシステムの導入**
   - リスク: 全コンポーネントの修正が必要
   - 軽減策: 段階的なロールアウト、feature flagの使用

3. **E2Eテストのセットアップ**
   - リスク: 環境構築の複雑さ
   - 軽減策: Maestroの使用（Detoxより簡単）

### 中リスク項目:
1. **差分アルゴリズムの変更**
   - リスク: 既存の動作を壊す可能性
   - 軽減策: 十分なテスト、段階的な導入

2. **ストアのキャッシング**
   - リスク: キャッシュ無効化のバグ
   - 軽減策: 明確なキャッシュ戦略、詳細なログ

---

## 20. 最終総括

### 現在の状態:
- ✅ **機能性**: ほぼ完全に動作する
- ⚠️ **保守性**: ストアの肥大化、デッドコードの存在
- ⚠️ **パフォーマンス**: 最適化の余地あり
- ❌ **完成度**: 未実装項目が多数
- ❌ **テスト**: ほぼ未整備

### リファクタリング後の期待される状態:
- ✅ **機能性**: より多くのLLMコマンド対応
- ✅ **保守性**: 明確な責任分離、クリーンなコード
- ✅ **パフォーマンス**: 最適化されたレンダリングとストレージアクセス
- ✅ **完成度**: 設定が実際に機能する
- ✅ **テスト**: 十分なカバレッジ

### 推奨される着手順序:
1. **まずはフェーズ1**: デッドコードとデバッグコードを削除（1-2週間）
2. **次にフェーズ2**: ストア分割とテーマシステム（4-6週間）
3. **その後フェーズ3-5**: 時間とリソースに応じて（6-8週間）

### 総開発期間: 約3-4ヶ月（14週間）

---

