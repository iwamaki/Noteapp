# Note-List画面 状態管理 リファクタリング分析

## 実行日
2025-10-21

## 目的
note-list画面の複雑化した状態管理をベストプラクティスに基づいて整理整頓する

---

## 1. 現状の問題点

### 1.1 複雑性の評価: **HIGH ⚠️**

| 項目 | 現状値 | 評価 |
|------|--------|------|
| ファイル数 | 22個 | 管理すべきモジュール数が多い |
| カスタムHooks数 | 8個 | 状態が分散している |
| 依存関係の深さ | 5層 | UI → Hooks → Service → Storage → AsyncStorage |
| NoteService行数 | 455行 | 単一責任原則違反（肥大化） |
| 管理する状態の種類 | 7+ | 複数の独立した状態が存在 |
| 非同期処理の複雑度 | HIGH | Promise.all多用、エラー時の同期が不完全 |

---

## 2. アーキテクチャ構造

### 2.1 現在のレイヤー構成

```
┌─────────────────────────────────────────┐
│      UI層 (Presentation)                 │
│  - NoteListScreen.tsx                   │
│  - TreeListItem.tsx                     │
│  - CreateItemModal.tsx                  │
│  - RenameItemModal.tsx                  │
│  - NoteListSearchBar.tsx                │
│  - OverflowMenu.tsx                     │
│  - NoteListEmptyState.tsx               │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│    Hooks層 (State Management)            │
│  - useNoteList (コーディネータ)          │
│  - useNoteTree                          │
│  - useItemSelection                     │
│  - useItemActions                       │
│  - useModalManager                      │
│  - useSearch                            │
│  - useNoteListHeader                    │
│  - useErrorHandler                      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│    Service層 (ビジネスロジック)           │
│  - NoteService (455行)                  │
│    - checkNoteDuplicate()               │
│    - checkFolderDuplicate()             │
│    - updateChildrenPaths()              │
│    - batchDelete()                      │
│    - validateMoveOperation()            │
│    - batchMove()                        │
│    - copyNotes()                        │
│    - renameItem()                       │
│    - ensureFoldersExist()               │
│    - createNote()                       │
│    - updateNote()                       │
│    - moveNote()                         │
│    - createFolder()                     │
│    - updateFolder()  ← 特に複雑        │
│    - createNoteWithPath()               │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│    Storage層                            │
│  - NoteListStorage (複合操作)            │
│    ├── Note functions                   │
│    │   - createNote()                   │
│    │   - updateNote()                   │
│    │   - deleteNotes()                  │
│    │   - copyNotes()                    │
│    │   - moveNote()                     │
│    └── Folder functions                 │
│        - createFolder()                 │
│        - updateFolder()                 │
│        - deleteFolder()                 │
│  - storage.ts (AsyncStorage操作)        │
│    - getAllNotesRaw()                   │
│    - saveAllNotes()                     │
│    - getAllFoldersRaw()                 │
│    - saveAllFolders()                   │
│  - AsyncStorage (@react-native)         │
└─────────────────────────────────────────┘
```

### 2.2 状態管理の階層構造

```
NoteListScreen.tsx (表現層)
    ↓
useNoteList() ← メインのカスタムフック
    ├── useNoteTree()           ← ツリー構造・データ取得
    ├── useItemSelection()      ← 選択状態管理
    ├── useItemActions()        ← アクション実行
    ├── useModalManager()       ← モーダル状態
    └── useSearch()             ← 検索機能
```

---

## 3. 主要な問題点の詳細

### 3.1 状態の分散管理 (State Fragmentation)

**問題:**
- 8つのカスタムフックが独立して状態を管理
- 依存関係が複雑で、状態同期が不完全
- どの操作がどの状態を変更するのか不明確

**具体例:**
```typescript
// useNoteList.ts のコールバック
const handleActionSuccess = useCallback(() => {
  refreshTree();           // ツリー再構築
  selection.clearSelection();  // 選択状態をクリア
  // しかし、expandedFolderIds や他の状態はどうなる？
}, [refreshTree, selection]);
```

**影響:**
- 状態の整合性が保証されない
- バグの原因特定が困難
- 新機能追加時の影響範囲が不明確

---

### 3.2 非同期処理の管理不備 (Async Handling Issues)

**問題:**
- AsyncStorageの非同期性が十分に考慮されていない
- 書き込みと読み込みの競合状態が発生
- **これが現在のフォルダリネームバグの根本原因**

**具体的な問題フロー:**
```typescript
// NoteService.updateFolder() でのデータフロー

1. フォルダ "A" をリネーム "A" → "A_new"

2. NoteService.updateFolder() が呼ばれる
   - 子フォルダのパス: /A → /A_new に更新
   - 子ノートのパス: /A → /A_new に更新

3. 一度に保存（トランザクション的に処理）
   await Promise.all([
     saveAllNotes(updatedNotes),
     saveAllFolders(updatedFolders),
   ]);

4. refreshTree() が呼ばれる

5. 問題: AsyncStorageの書き込みが完了する前に
   getAllFolders() と getAllNotes() が実行される

6. buildTree() が古い情報と新しい情報が混在したデータで動作

7. 親フォルダの新しいパスと子フォルダの古いパスが一致せず、
   親子関係が失われる

8. 結果: 子要素がUIから消える
```

**影響:**
- Issue #010: フォルダリネーム時に子要素が消える
- ユーザー体験の悪化
- データ整合性への不信感

---

### 3.3 ツリー構造の重複計算 (Redundant Tree Computation)

**問題:**
- `buildTree()` が毎回全データから再構築
- 計算量が O(n) で、データ量に比例して性能低下

**具体例:**
```typescript
// useNoteTree.ts
const treeNodes = useMemo(() => {
  return buildTree(folders, notes, expandedFolderIds);
}, [folders, notes, expandedFolderIds]);  // 依存配列が大きい

// buildTree() は O(n) の走査を複数回実行
function buildTree(allFolders, allNotes, expandedFolderIds) {
  const rootItems = getRootItems(allFolders, allNotes);  // O(n)
  const tree = rootItems.map(item =>
    buildTreeNode(item, allFolders, allNotes, expandedFolderIds, 0)  // 再帰的 O(n)
  );
}
```

**影響:**
- ノート数・フォルダ数が増えると遅延が発生
- 不要な再レンダリングが発生
- バッテリー消費の増加

---

### 3.4 NoteServiceの肥大化 (Service Bloat)

**問題:**
- 455行に達している
- 以下の責務が混在:
  1. ビジネスロジック（重複チェック、バリデーション）
  2. ストレージ操作の抽象化
  3. パス管理ロジック

**責務の混在例:**
```typescript
class NoteService {
  // ビジネスロジック
  static async checkNoteDuplicate(...)
  static async checkFolderDuplicate(...)
  static async validateMoveOperation(...)

  // ストレージ操作の抽象化
  static async createNote(...)
  static async updateNote(...)
  static async deleteNotes(...)

  // パス管理ロジック
  static updateChildrenPaths(...)
  static ensureFoldersExist(...)

  // 複雑な複合操作
  static async updateFolder(...)  // 特に肥大化している
  static async batchMove(...)
}
```

**影響:**
- 単一責任原則 (SRP) 違反
- テストが困難
- 変更の影響範囲が広い

---

### 3.5 選択状態とアクション間の不整合 (Selection-Action Mismatch)

**問題:**
- `useItemSelection` と `useItemActions` が独立している
- 選択後のアクション実行時に同期が取れない可能性

**具体例:**
```typescript
// useItemActions で削除実行時
handleDeleteSelected() {
  await NoteService.batchDelete({
    noteIds: Array.from(selectedNoteIds),
    folderIds: Array.from(selectedFolderIds),
  });
  onSuccess(); // refreshTree + clearSelection
}
// しかし、削除中に別のコンポーネントから選択状態が変更されると？
```

**影響:**
- 削除対象のアイテムと実際の選択状態が一致しない可能性
- ユーザーが意図しないアイテムが削除される危険性

---

### 3.6 データフロー全体の可視性不足 (Visibility Issues)

**問題:**
- どの操作がどの状態を変更するのか明確でない
- デバッグ時にデータの流れを追うのが困難

**具体例:**
```typescript
// 例: refreshTree() が何をリセットするのか不明確
const handleActionSuccess = useCallback(() => {
  refreshTree();  // ← 内部で何が起きているのか？
  selection.clearSelection();
}, [refreshTree, selection]);
```

**影響:**
- 新しい開発者の学習コストが高い
- バグ修正に時間がかかる
- リファクタリングが困難

---

## 4. 管理されている状態の一覧

### 4.1 useNoteTree

```typescript
- folders: Folder[]                    // 全フォルダのリスト
- notes: Note[]                        // 全ノートのリスト
- expandedFolderIds: Set<string>       // 展開中のフォルダID
- loading: boolean                     // ロード状態
- treeNodes: TreeNode[]                // メモ化されたツリー構造
- items: FileSystemItem[]              // 後方互換性用（廃止予定）
```

### 4.2 useItemSelection

```typescript
- isSelectionMode: boolean             // 複選択モード
- selectedNoteIds: Set<string>         // 選択ノートID
- selectedFolderIds: Set<string>       // 選択フォルダID
```

### 4.3 useItemActions

```typescript
- isMoveMode: boolean                  // 移動モード
```

### 4.4 useModalManager

```typescript
- isCreateModalVisible: boolean        // 作成モーダル表示状態
- isRenameModalVisible: boolean        // リネームモーダル表示状態
- itemToRename: FileSystemItem | null  // リネーム対象アイテム
```

### 4.5 useSearch

```typescript
- isSearchActive: boolean              // 検索モード
- searchQuery: string                  // 検索クエリ
- searchOptions: SearchOptions         // 検索オプション
  - target: 'all' | 'notes' | 'folders'
  - field: 'title' | 'body' | 'both'
  - caseSensitive: boolean
- filteredNodes: TreeNode[]            // メモ化された検索結果
```

---

## 5. ファイル構成の完全一覧

```
app/screen/note-list/
├── NoteListScreen.tsx                          (メインコンポーネント)
├── hooks/
│   ├── useNoteList.ts                          (統合コーディネータ)
│   ├── useNoteTree.ts                          (ツリーデータ管理)
│   ├── useItemSelection.ts                     (選択状態)
│   ├── useItemActions.ts                       (アクション実行)
│   ├── useModalManager.ts                      (モーダル状態)
│   ├── useSearch.ts                            (検索・フィルタリング)
│   ├── useNoteListHeader.tsx                   (ヘッダー)
│   └── useErrorHandler.ts                      (エラー処理)
├── components/
│   ├── TreeListItem.tsx                        (リスト行)
│   ├── CreateItemModal.tsx                     (作成モーダル)
│   ├── RenameItemModal.tsx                     (リネームモーダル)
│   ├── NoteListSearchBar.tsx                   (検索バー)
│   ├── OverflowMenu.tsx                        (メニュー)
│   └── NoteListEmptyState.tsx                  (空状態)
├── services/
│   └── noteService.ts                          (ビジネスロジック 455行)
├── noteStorage/
│   ├── index.ts                                (複合API)
│   ├── storage.ts                              (AsyncStorage操作)
│   ├── note.ts                                 (ノート操作)
│   └── folder.ts                               (フォルダ操作)
├── utils/
│   ├── treeUtils.ts                            (ツリー構造構築)
│   └── typeGuards.ts                           (型チェック)
└── __tests__/
    └── testUtils.ts                            (テスト補助)
```

---

## 6. 即座に対応すべき課題の優先順位

### Priority 1: 🔴 Critical

1. **フォルダリネームバグ (Issue #010)**
   - 原因: AsyncStorageの非同期書き込み完了待機メカニズムの不備
   - 影響: ユーザーデータが消えたように見える重大なバグ
   - 対応: 非同期処理の改善

### Priority 2: 🟠 High

2. **状態の分散管理**
   - 原因: 8つの独立したカスタムフック
   - 影響: 状態整合性の欠如、バグの温床
   - 対応: 一元化された状態管理の導入

3. **NoteServiceの肥大化**
   - 原因: 責務の混在
   - 影響: 保守性の低下、テストが困難
   - 対応: 責務分割（3層に分離）

### Priority 3: 🟡 Medium

4. **ツリー構造の重複計算**
   - 原因: 毎回全データから再構築
   - 影響: パフォーマンス低下
   - 対応: 差分更新の導入

5. **データフロー全体の可視性不足**
   - 原因: 複雑な依存関係
   - 影響: デバッグ困難、学習コスト高
   - 対応: ドキュメント化、アーキテクチャ図の作成

---

## 7. まとめ

note-list画面の状態管理は以下の問題により、保守性が著しく低下しています：

1. **状態の分散管理**: 8つのカスタムフックが独立して動作
2. **非同期処理の不備**: AsyncStorage の競合状態がバグの原因
3. **サービスの肥大化**: 455行のNoteServiceに責務が集中
4. **パフォーマンス問題**: ツリー構造の全体再構築
5. **可視性の欠如**: データフローが不明確

これらの課題に対して、ベストプラクティスに基づいた改善案を次のドキュメントで提案します。

---

## 次のステップ

次のドキュメント「note-list-state-management-refactoring-plan.md」にて、
以下の改善案を提案します：

1. 状態管理の一元化（useReducer + Context）
2. NoteServiceの3層分割
3. 非同期処理の改善（AsyncStorageの競合解消）
4. パフォーマンス最適化
5. 段階的な移行計画
