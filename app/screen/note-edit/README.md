# Note Edit Feature - Refactored Architecture

このドキュメントは、リファクタリング後のnote-editフィーチャーのアーキテクチャと使用方法を説明します。

## 📁 ディレクトリ構造

```
app/screen/note-edit/
├── NoteEditScreen.tsx              # メイン画面（薄いプレゼンテーション層）
├── types/
│   └── index.ts                    # 型定義の集約
├── stores/
│   ├── NoteEditorStore.ts          # 状態管理（Zustand）
│   └── HistoryManager.ts           # 履歴管理の独立クラス
├── services/
│   ├── NoteService.ts              # ビジネスロジック層
│   ├── ValidationService.ts        # バリデーション
│   └── ErrorService.ts             # エラー処理
├── repositories/
│   ├── NoteRepository.ts           # データアクセス層のインターフェース
│   └── AsyncStorageNoteRepository.ts # 実装
├── hooks/
│   ├── useNoteEditorV2.tsx         # 新しい統合フック（推奨）
│   ├── useNoteEditor.tsx           # 既存フック（互換性のため保持）
│   ├── useAutoSave.ts              # 自動保存専用
│   ├── useKeyboardShortcuts.ts     # キーボードショートカット
│   └── useUnsavedChangesWarning.ts # 未保存警告
├── components/
│   ├── header/
│   │   ├── NoteEditHeader.tsx
│   │   └── ...
│   ├── editor/
│   │   ├── TextEditor.tsx
│   │   ├── MarkdownPreview.tsx
│   │   └── FileEditor.tsx
│   └── ...
└── utils/
    └── (ユーティリティ関数)
```

## 🏗️ アーキテクチャの層

### 1. **プレゼンテーション層**
- **NoteEditScreen.tsx**: 薄い画面コンポーネント
- **components/**: UIコンポーネント

### 2. **フック層**
- **useNoteEditorV2**: 統合されたファサードフック
- **useAutoSave**: 自動保存機能
- **useKeyboardShortcuts**: キーボードショートカット
- **useUnsavedChangesWarning**: 未保存警告

### 3. **状態管理層**
- **NoteEditorStore**: Zustandストア（状態とアクションを管理）
- **HistoryManager**: 履歴管理（Undo/Redo）

### 4. **ビジネスロジック層**
- **NoteService**: ノート操作のビジネスロジック
- **ValidationService**: バリデーション
- **ErrorService**: エラー処理

### 5. **データアクセス層**
- **NoteRepository**: インターフェース
- **AsyncStorageNoteRepository**: 実装

## 🚀 使用方法

### 基本的な使い方（推奨）

新しい`useNoteEditorV2`フックを使用:

```typescript
import { useNoteEditorV2 } from './hooks/useNoteEditorV2';

function NoteEditScreen() {
  const { noteId } = route.params || {};

  const {
    note,
    title,
    content,
    isDirty,
    isLoading,
    setContent,
    setTitle,
    save,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useNoteEditorV2(noteId);

  return (
    <View>
      {/* UI コンポーネント */}
    </View>
  );
}
```

### 既存コードとの互換性

既存の`useNoteEditor`フックも引き続き使用可能です:

```typescript
import { useNoteEditor } from './hooks/useNoteEditor';

// 既存コードはそのまま動作します
const editor = useNoteEditor(noteId);
```

### ストアへの直接アクセス

より細かい制御が必要な場合は、ストアに直接アクセス:

```typescript
import { useNoteEditorStore } from './stores/NoteEditorStore';

function MyComponent() {
  const content = useNoteEditorStore((state) => state.content);
  const setContent = useNoteEditorStore((state) => state.setContent);

  // 特定の状態のみを購読できる
}
```

### サービスレイヤーの使用

ビジネスロジックを直接使用したい場合:

```typescript
import { noteService } from './services/NoteService';

async function loadNote(id: string) {
  try {
    const note = await noteService.loadNote(id);
    console.log('Loaded:', note);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

## 🎯 設計原則

### 単一責任の原則
各モジュールは単一の責任を持ちます:
- **Store**: 状態管理のみ
- **Service**: ビジネスロジックのみ
- **Repository**: データアクセスのみ
- **Hook**: 機能の組み合わせ

### 依存性の注入
サービスはリポジトリをコンストラクタで受け取り、テストが容易:

```typescript
const customRepo = new CustomNoteRepository();
const service = new NoteService(customRepo, validator, errorService);
```

### 型安全性
すべての型は`types/index.ts`で定義され、一元管理:

```typescript
import { EditorState, EditorActions, ViewMode } from './types';
```

## 🧪 テスト

### ストアのテスト

```typescript
import { useNoteEditorStore } from './stores/NoteEditorStore';

test('content update', () => {
  const { setContent, content } = useNoteEditorStore.getState();
  setContent('New content');
  expect(useNoteEditorStore.getState().content).toBe('New content');
});
```

### サービスのテスト

```typescript
import { NoteService } from './services/NoteService';

test('save note', async () => {
  const mockRepo = createMockRepository();
  const service = new NoteService(mockRepo, validator, errorService);

  const note = await service.save({ title: 'Test', content: 'Content' });
  expect(note.title).toBe('Test');
});
```

## 📊 移行ガイド

### 段階的な移行

1. **新規コード**: `useNoteEditorV2`を使用
2. **既存コード**: 必要に応じて段階的に移行
3. **テスト**: 既存機能が正常に動作することを確認

### 移行時の注意点

- 既存の`useNoteEditor`は互換性のため保持
- 新しいストアと古いフックは共存可能
- 段階的に移行することを推奨

## 🔧 カスタマイズ

### 自動保存の有効化

`useNoteEditorV2.tsx`で自動保存を有効化:

```typescript
useAutoSave({
  enabled: true,  // trueに変更
  delay: 5000,
  onSave: store.save,
  isDirty: store.isDirty,
});
```

### カスタムバリデーション

```typescript
import { ValidationService } from './services/ValidationService';

const validator = new ValidationService();
validator.addRule({
  field: 'title',
  validate: (value) => value.length >= 5,
  message: 'タイトルは5文字以上必要です',
});
```

## 📚 参考資料

- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [React Hook Patterns](https://reactjs.org/docs/hooks-intro.html)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)

## 🎉 まとめ

このリファクタリングにより:

✅ **保守性の向上**: 責任が明確で理解しやすい
✅ **テスタビリティ**: 各層を独立してテスト可能
✅ **拡張性**: 新機能の追加が容易
✅ **型安全性**: TypeScriptの恩恵を最大限に活用
✅ **再利用性**: 小さなモジュールを他の画面でも使用可能
