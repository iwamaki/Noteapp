# リファクタリング計画: NoteEdit機能の設計哲学とフォルダ構造

## 設計哲学

### 1. **関心の分離 (Separation of Concerns)**
- **UI層**: プレゼンテーション専念
- **ロジック層**: ビジネスロジックとステート管理
- **データ層**: データの永続化と取得
- **ユーティリティ層**: 再利用可能な汎用機能

### 2. **単一責任の原則 (Single Responsibility Principle)**
- 各モジュールは1つの明確な責任を持つ
- 変更の理由は1つだけであるべき

### 3. **依存性の方向性**
```
UI層 → ロジック層 → データ層
  ↓       ↓
ユーティリティ層
```

## 提案するフォルダ構成

```
features/note-edit/
├── NoteEditScreen.tsx                 # エントリーポイント（UIのみ）
│
├── components/                        # UI コンポーネント
│   ├── NoteEditHeader.tsx            # ヘッダー（タイトル入力 + Undo/Redo UI）
│   ├── FileEditor.tsx                # エディタコンテナ（モード切替UI）
│   └── editors/                      # エディタの実装
│       ├── TextEditor.tsx
│       └── MarkdownPreview.tsx
│
├── hooks/                            # カスタムフック（UIロジック層）
│   ├── useNoteEditor.tsx            # メインロジック（統合フック）
│   ├── useNoteEditHeader.tsx        # ヘッダー設定ロジック
│   └── useNoteOperations.tsx        # NEW: ノート操作（CRUD）の抽象化
│
├── state/                            # NEW: ステート管理層
│   ├── useContentHistory.tsx        # 履歴管理（Undo/Redo）
│   └── useNoteState.tsx             # NEW: ノートのローカルステート管理
│
├── services/                         # NEW: データアクセス層
│   └── noteStorage.ts               # ストレージ操作（移動）
│
└── utils/                            # NEW: ユーティリティ層
    ├── debounce.ts                  # デバウンス処理
    ├── contentDiff.ts               # コンテンツ差分検出
    ├── validation.ts                # バリデーション（タイトル、コンテンツ）
    └── constants.ts                 # 定数定義（DEBOUNCE_DELAY等）
```

## リファクタリングの戦略

### Phase 1: ユーティリティの抽出

#### `utils/debounce.ts`
**責任**: 汎用的なデバウンス処理
```typescript
// useNoteEditor.tsx から抽出
- debounceTimer の管理ロジック
- 再利用可能なカスタムフック化
```

#### `utils/contentDiff.ts`
**責任**: コンテンツ変更検出
```typescript
// useNoteEditor.tsx から抽出
- note.content === content の比較ロジック
- より洗練された差分検出アルゴリズム
```

#### `utils/validation.ts`
**責任**: 入力値の検証
```typescript
// 新規作成
- タイトルの妥当性検証
- コンテンツの妥当性検証
```

#### `utils/constants.ts`
**責任**: マジックナンバーの排除
```typescript
// NoteEditScreen.tsx、useNoteEditor.tsx から抽出
- CHAT_INPUT_HEIGHT
- DEBOUNCE_DELAY (現在は300ms)
- KEYBOARD_ANIMATION_DURATION
```

---

### Phase 2: ステート管理の分離

#### `state/useNoteState.tsx`
**責任**: ノートのローカルステート管理
```typescript
// useNoteEditor.tsx から抽出
- note, title, content, isLoading の管理
- setTitle, setContent の提供
- 派生ステート（hasChanges等）の計算
```

**利点**:
- useNoteEditor が肥大化するのを防ぐ
- ステート管理ロジックの再利用性向上

#### useContentHistory.tsx（既存）
**現状**: すでに適切に分離されている ✓
**改善点**: 
- TypeScript の厳格化
- エラーハンドリングの追加

---

### Phase 3: データアクセス層の整理

#### noteStorage.ts（移動）
**現状の問題**:
- noteStorage.ts が features/note-edit 直下にある
- データアクセス層であることが明確でない

**改善策**:
- `services/` フォルダに移動
- インターフェースとして抽象化（将来的に他のストレージに切り替え可能）

```typescript
// services/noteStorageService.ts
export interface INoteStorage {
  getNoteById(id: string): Promise<Note | null>;
  createNote(data: CreateNoteData): Promise<Note>;
  updateNote(data: UpdateNoteData): Promise<Note>;
  // ...
}

// services/asyncNoteStorage.ts (実装)
export class AsyncNoteStorage implements INoteStorage {
  // 現在の NoteEditStorage の実装
}
```

---

### Phase 4: フックの責任分割

#### `hooks/useNoteOperations.tsx`（新規）
**責任**: ノートのCRUD操作の抽象化
```typescript
// useNoteEditor.tsx から抽出
- handleSave ロジック
- ノートの作成/更新ロジック
- エラーハンドリング
```

**利点**:
- ビジネスロジックとUIロジックの分離
- テスタビリティの向上

#### useNoteEditor.tsx（リファクタリング後）
**新しい責任**: オーケストレーション層
```typescript
// 他のフックを統合して、UIに必要なインターフェースを提供
- useNoteState
- useContentHistory
- useNoteOperations
- デバウンス処理（utils経由）
```

---

### Phase 5: コンポーネントの最適化

#### NoteEditHeader.tsx
**改善点**:
- IME処理ロジックを `utils/imeHandler.ts` に抽出
- Undo/Redoボタンを独立コンポーネント化

#### FileEditor.tsx
**改善点**:
- ViewMode の型定義を `types/viewMode.ts` に移動
- エディタ切り替えロジックを `utils/editorFactory.ts` に抽出

---

## 依存関係グラフ（リファクタリング後）

```
NoteEditScreen.tsx
  ↓
useNoteEditor.tsx (オーケストレーター)
  ├→ useNoteState.tsx
  ├→ useContentHistory.tsx
  ├→ useNoteOperations.tsx
  │    ↓
  │  noteStorageService (interface)
  │    ↓
  │  asyncNoteStorage (implementation)
  └→ utils/
       ├─ debounce.ts
       ├─ contentDiff.ts
       ├─ validation.ts
       └─ constants.ts
```

---

## 期待される効果

### 1. **見通しの良さ**
- 各ファイルの責任が明確
- ファイル名から役割が即座に理解できる

### 2. **保守性の向上**
- 変更の影響範囲が局所化
- バグ修正が容易

### 3. **再利用性**
- ユーティリティは他の機能でも使用可能
- フックの組み合わせで新機能を実装可能

### 4. **テスタビリティ**
- 各層が独立してテスト可能
- モックの作成が容易

### 5. **拡張性**
- 新しいエディタタイプの追加が容易
- ストレージの切り替えが可能（AsyncStorage → SQLite等）

---

## 実装順序の推奨

1. **utils/ の作成** → 既存コードへの影響が最小
2. **state/ の分離** → ステート管理の明確化
3. **services/ の整理** → データ層の抽象化
4. **hooks/ の分割** → ビジネスロジックの整理
5. **components/ の最適化** → UI層のクリーンアップ

この順序により、段階的かつ安全にリファクタリングを進められます。