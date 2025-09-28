# 🔨 React Native ノートアプリ リファクタリング提案

## 🚨 最優先修正事項

### 1. **致命的バグ: storageService.ts**
**現在の問題**: 
- `getNoteById()` は個別キー `@note:${id}` を期待
- `saveNote()` は配列として `'notes'` キーに保存
- **完全に動作しない実装**

**修正済み**: 新しい `NoteStorageService` クラスで一貫性のある配列ベース実装

### 2. **型定義の欠如**
- `src/types/note.ts` と `src/types/api.ts` が空
- shared フォルダが未提供で型が不明

## 📦 主要リファクタリング

### ✅ 完了済み修正

#### 1. **storageService.ts** 
- 一貫性のあるストレージ実装
- 適切なエラーハンドリング
- 検索機能追加
- TypeScript型安全性向上

#### 2. **llmService.ts**
- 静的クラスからインスタンス化対応
- メモリリーク防止
- タイムアウト処理追加
- 適切なエラークラス

#### 3. **noteStore.ts**
- Zustand ミドルウェア活用
- 詳細なエラー状態管理
- 検索・フィルタ機能
- セレクター分離

#### 4. **ChatPanel.tsx**
- 型アサーション削除
- useMemo でパフォーマンス最適化
- より良いエラーハンドリング

## 🔄 その他の推奨改善

### コンポーネント設計

#### FileEditor.tsx
```typescript
// 現在：複雑なモード管理
const [mode, setMode] = useState<ViewMode>('edit');

// 推奨：状態機械パターン
import { useMachine } from '@xstate/react';
import { fileEditorMachine } from './fileEditorMachine';
```

#### DiffView.tsx
```typescript
// 型アサーション削除
- selectedBlocks.has(line.changeBlockId as number)
+ selectedBlocks.has(line.changeBlockId!)

// Nullチェック改善
if (line.changeBlockId !== null && selectedBlocks.has(line.changeBlockId)) {
  // 処理
}
```

### アーキテクチャ改善

#### 1. **共通エラーハンドリング**
```typescript
// src/utils/errorHandler.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public category: 'STORAGE' | 'NETWORK' | 'VALIDATION'
  ) {
    super(message);
  }
}

export const errorHandler = {
  handle: (error: unknown, context?: string) => {
    // ログ記録
    // ユーザー通知
    // エラー報告
  }
};
```

#### 2. **設定管理**
```typescript
// src/config/index.ts
export const config = {
  api: {
    baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000',
    timeout: 30000,
  },
  storage: {
    maxNotes: 1000,
    maxHistorySize: 100,
  },
  ui: {
    debounceMs: 300,
    animationDuration: 200,
  }
};
```

#### 3. **カスタムフック分離**
```typescript
// src/hooks/useNoteEditor.ts
export const useNoteEditor = (noteId?: string) => {
  const { activeNote, draftNote, setDraftNote } = useNoteStore();
  const [isModified, setIsModified] = useState(false);
  
  // エディター固有のロジック
  return {
    note: activeNote,
    draft: draftNote,
    isModified,
    updateDraft: setDraftNote,
    // ...
  };
};
```

### パフォーマンス最適化

#### 1. **React.memo の活用**
```typescript
// NoteListItem.tsx
export const NoteListItem = React.memo<NoteListItemProps>(({ note, onPress }) => {
  // ...
});
```

#### 2. **仮想化リスト**
```typescript
// 大量ノート対応
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={notes}
  renderItem={renderNoteItem}
  estimatedItemSize={80}
/>
```

### テスト改善

#### 1. **包括的テスト**
```typescript
// __tests__/noteStore.test.ts
describe('NoteStore', () => {
  test('should handle concurrent saves', async () => {
    // 同時保存のテスト
  });
  
  test('should recover from storage errors', async () => {
    // エラー回復のテスト
  });
});
```

#### 2. **E2Eテスト**
```typescript
// e2e/noteCreation.e2e.ts
describe('Note Creation Flow', () => {
  test('should create and save note with diff view', async () => {
    // E2Eフローテスト
  });
});
```

### セキュリティ強化

#### 1. **入力サニタイズ**
```typescript
// src/utils/sanitizer.ts
export const sanitizeContent = (content: string): string => {
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim();
};
```

#### 2. **データ検証**
```typescript
// src/utils/validators.ts
import { z } from 'zod';

export const noteSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(100000),
  tags: z.array(z.string()).optional(),
});
```

## 📁 推奨ファイル構成

```
src/
├── components/          # 共通コンポーネント
│   ├── ui/             # UIプリミティブ
│   └── layout/         # レイアウトコンポーネント
├── features/           # 機能別モジュール
│   ├── notes/          # ノート機能
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   └── chat/           # チャット機能
├── services/           # 外部サービス
├── store/              # 状態管理
├── utils/              # ユーティリティ
├── types/              # 型定義
├── config/             # 設定
└── __tests__/          # テスト
```

## 🎯 実装優先度

### 🔴 高優先度（即座に修正）
1. storageService の矛盾修正
2. 型定義の整備
3. エラーハンドリング統一

### 🟡 中優先度（1-2週間以内）
1. ChatPanel の型アサーション削除
2. DiffView の型安全性向上
3. テストカバレッジ向上

### 🟢 低優先度（長期的改善）
1. パフォーマンス最適化
2. アーキテクチャリファクタリング
3. セキュリティ強化

## 💡 追加提案

### 1. **状態管理改善**
- Zustand の persist middleware 活用
- デバウンス処理でパフォーマンス向上

### 2. **UX改善**
- オフライン対応
- 自動保存機能
- キーボードショートカット

### 3. **開発体験**
- ESLint/Prettier 設定強化
- Husky でコミット時検証
- Github Actions CI/CD

これらの改善により、コードの保守性、パフォーマンス、ユーザビリティが大幅に向上します。
