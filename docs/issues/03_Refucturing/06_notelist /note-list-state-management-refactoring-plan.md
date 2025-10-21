# Note-List画面 状態管理 リファクタリング計画

## 実行日
2025-10-21

## 目的
note-list画面の複雑化した状態管理をベストプラクティスに基づいて整理整頓する

---

## 1. 改善アプローチの方針

### 1.1 設計原則

本リファクタリングは以下のベストプラクティスに基づきます：

1. **単一責任原則 (SRP)**: 各モジュールは1つの責務のみを持つ
2. **状態の一元管理**: 分散した状態を集約し、Single Source of Truth を確立
3. **非同期処理の明確化**: AsyncStorageの読み書きを確実に同期
4. **疎結合・高凝集**: モジュール間の依存を最小化
5. **段階的移行**: 既存機能を壊さず、段階的にリファクタリング

### 1.2 技術選定

| 項目 | 採用技術 | 理由 |
|------|---------|------|
| 状態管理 | `useReducer + Context` | Redux導入は過剰、Reactの標準APIで十分 |
| 非同期処理 | `async/await + Promise` | AsyncStorageの書き込み完了を確実に待機 |
| サービス分割 | 3層アーキテクチャ | Domain層、Application層、Infrastructure層 |
| パフォーマンス | `useMemo` + 差分更新 | 全体再構築を避け、変更部分のみ更新 |
| テスト | Jest + React Testing Library | 既存のテスト環境を活用 |

---

## 2. 改善案の詳細設計

### 2.1 状態管理の一元化

#### 現状の問題
- 8つのカスタムフックが独立して状態を管理
- 状態の整合性が保証されない

#### 改善案: useReducer + Context による一元管理

**新しい状態管理構造:**

```typescript
// app/screen/note-list/context/NoteListContext.tsx

interface NoteListState {
  // データ
  folders: Folder[]
  notes: Note[]
  treeNodes: TreeNode[]

  // UI状態
  expandedFolderIds: Set<string>
  loading: boolean

  // 選択状態
  isSelectionMode: boolean
  selectedNoteIds: Set<string>
  selectedFolderIds: Set<string>

  // モーダル状態
  modals: {
    create: { visible: boolean }
    rename: { visible: boolean; item: FileSystemItem | null }
  }

  // 検索状態
  search: {
    isActive: boolean
    query: string
    options: SearchOptions
  }

  // 移動モード
  isMoveMode: boolean
}

type NoteListAction =
  // データ更新
  | { type: 'SET_DATA'; payload: { folders: Folder[]; notes: Note[] } }
  | { type: 'SET_LOADING'; payload: boolean }

  // ツリー操作
  | { type: 'TOGGLE_FOLDER'; payload: string }
  | { type: 'EXPAND_FOLDER'; payload: string }
  | { type: 'COLLAPSE_FOLDER'; payload: string }

  // 選択操作
  | { type: 'ENTER_SELECTION_MODE' }
  | { type: 'EXIT_SELECTION_MODE' }
  | { type: 'TOGGLE_SELECT_NOTE'; payload: string }
  | { type: 'TOGGLE_SELECT_FOLDER'; payload: string }
  | { type: 'CLEAR_SELECTION' }

  // モーダル操作
  | { type: 'OPEN_CREATE_MODAL' }
  | { type: 'CLOSE_CREATE_MODAL' }
  | { type: 'OPEN_RENAME_MODAL'; payload: FileSystemItem }
  | { type: 'CLOSE_RENAME_MODAL' }

  // 検索操作
  | { type: 'START_SEARCH'; payload: { query: string; options: SearchOptions } }
  | { type: 'UPDATE_SEARCH_QUERY'; payload: string }
  | { type: 'END_SEARCH' }

  // 移動モード
  | { type: 'ENTER_MOVE_MODE' }
  | { type: 'EXIT_MOVE_MODE' }

  // 複合操作
  | { type: 'REFRESH_COMPLETE'; payload: { folders: Folder[]; notes: Note[] } }

const noteListReducer = (
  state: NoteListState,
  action: NoteListAction
): NoteListState => {
  switch (action.type) {
    case 'SET_DATA':
      return {
        ...state,
        folders: action.payload.folders,
        notes: action.payload.notes,
        treeNodes: buildTree(
          action.payload.folders,
          action.payload.notes,
          state.expandedFolderIds
        ),
      }

    case 'TOGGLE_FOLDER': {
      const newExpanded = new Set(state.expandedFolderIds)
      if (newExpanded.has(action.payload)) {
        newExpanded.delete(action.payload)
      } else {
        newExpanded.add(action.payload)
      }
      return {
        ...state,
        expandedFolderIds: newExpanded,
        treeNodes: buildTree(state.folders, state.notes, newExpanded),
      }
    }

    case 'EXIT_SELECTION_MODE':
      return {
        ...state,
        isSelectionMode: false,
        selectedNoteIds: new Set(),
        selectedFolderIds: new Set(),
      }

    case 'REFRESH_COMPLETE':
      // 全状態をリセットしながら、データのみ更新
      return {
        ...state,
        folders: action.payload.folders,
        notes: action.payload.notes,
        treeNodes: buildTree(
          action.payload.folders,
          action.payload.notes,
          state.expandedFolderIds
        ),
        loading: false,
        // 選択状態はクリア
        isSelectionMode: false,
        selectedNoteIds: new Set(),
        selectedFolderIds: new Set(),
        // モーダルは閉じる
        modals: {
          create: { visible: false },
          rename: { visible: false, item: null },
        },
      }

    // ... 他のアクション
  }
}
```

**Context Provider:**

```typescript
// app/screen/note-list/context/NoteListProvider.tsx

export const NoteListProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(noteListReducer, initialState)

  // 非同期アクションを実行するためのヘルパー関数
  const refreshData = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      // AsyncStorageから確実にデータを取得
      const [folders, notes] = await Promise.all([
        NoteListStorage.getAllFolders(),
        NoteListStorage.getAllNotes(),
      ])
      // データ更新と状態リセットを一括実行
      dispatch({ type: 'REFRESH_COMPLETE', payload: { folders, notes } })
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false })
      throw error
    }
  }, [])

  const value = {
    state,
    dispatch,
    actions: {
      refreshData,
      // ... 他のアクション
    },
  }

  return (
    <NoteListContext.Provider value={value}>
      {children}
    </NoteListContext.Provider>
  )
}
```

**利点:**

1. **Single Source of Truth**: 全状態が1箇所で管理される
2. **状態遷移の明確化**: アクションで状態変更が追跡可能
3. **テスタビリティ向上**: reducerは純粋関数でテストしやすい
4. **デバッグ容易性**: アクションログで状態変化を追跡可能
5. **型安全性**: TypeScriptで状態とアクションを厳密に型付け

---

### 2.2 NoteServiceの3層分割

#### 現状の問題
- 455行のNoteServiceに責務が混在
- ビジネスロジック、ストレージ操作、パス管理が混在

#### 改善案: Domain層、Application層、Infrastructure層に分割

**新しい3層アーキテクチャ:**

```
┌──────────────────────────────────────────┐
│   Application層 (Use Cases)              │
│   - NoteListUseCases.ts                  │
│     - deleteSelectedItems()              │
│     - moveSelectedItems()                │
│     - renameItem()                       │
│     - createItemWithPath()               │
└──────────────────────────────────────────┘
                    ↓ 使用
┌──────────────────────────────────────────┐
│   Domain層 (ビジネスロジック)              │
│   - NoteDomainService.ts                 │
│     - validateNoteName()                 │
│     - checkDuplicate()                   │
│     - validateMoveOperation()            │
│   - FolderDomainService.ts               │
│     - validateFolderName()               │
│     - checkDuplicate()                   │
│     - getChildFolders()                  │
│     - getChildNotes()                    │
│   - PathService.ts (既存)                │
│     - normalizePath()                    │
│     - joinPaths()                        │
│     - getParentPath()                    │
└──────────────────────────────────────────┘
                    ↓ 使用
┌──────────────────────────────────────────┐
│   Infrastructure層 (データアクセス)        │
│   - NoteRepository.ts                    │
│     - getAll()                           │
│     - save()                             │
│     - delete()                           │
│     - batchUpdate()                      │
│   - FolderRepository.ts                  │
│     - getAll()                           │
│     - save()                             │
│     - delete()                           │
│     - batchUpdate()                      │
│   - NoteListStorage.ts (既存を活用)       │
└──────────────────────────────────────────┘
```

**具体的な分割例:**

**1. Domain層: NoteDomainService.ts**

```typescript
// app/screen/note-list/domain/NoteDomainService.ts

export class NoteDomainService {
  /**
   * ノート名のバリデーション
   */
  static validateNoteName(name: string): { valid: boolean; error?: string } {
    if (!name.trim()) {
      return { valid: false, error: 'ノート名を入力してください' }
    }
    if (name.length > 100) {
      return { valid: false, error: 'ノート名は100文字以内にしてください' }
    }
    return { valid: true }
  }

  /**
   * 重複チェック
   */
  static async checkDuplicate(
    title: string,
    folderPath: string,
    excludeId?: string
  ): Promise<{ isDuplicate: boolean; existing?: Note }> {
    const allNotes = await NoteRepository.getAll()
    const existing = allNotes.find(
      note =>
        note.title === title &&
        note.folderPath === folderPath &&
        note.id !== excludeId
    )
    return {
      isDuplicate: !!existing,
      existing,
    }
  }

  /**
   * ノートの移動可能性チェック
   */
  static async validateMoveOperation(
    noteIds: string[],
    targetFolderPath: string
  ): Promise<{ valid: boolean; errors: string[] }> {
    const allNotes = await NoteRepository.getAll()
    const errors: string[] = []

    for (const noteId of noteIds) {
      const note = allNotes.find(n => n.id === noteId)
      if (!note) {
        errors.push(`ノート ${noteId} が見つかりません`)
        continue
      }

      const { isDuplicate } = await this.checkDuplicate(
        note.title,
        targetFolderPath,
        noteId
      )
      if (isDuplicate) {
        errors.push(`"${note.title}" は移動先に既に存在します`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}
```

**2. Domain層: FolderDomainService.ts**

```typescript
// app/screen/note-list/domain/FolderDomainService.ts

export class FolderDomainService {
  /**
   * フォルダ名のバリデーション
   */
  static validateFolderName(name: string): { valid: boolean; error?: string } {
    if (!name.trim()) {
      return { valid: false, error: 'フォルダ名を入力してください' }
    }
    if (name.includes('/')) {
      return { valid: false, error: 'フォルダ名に "/" は使用できません' }
    }
    if (name.length > 50) {
      return { valid: false, error: 'フォルダ名は50文字以内にしてください' }
    }
    return { valid: true }
  }

  /**
   * 子フォルダを取得
   */
  static getChildFolders(
    parentFolderPath: string,
    allFolders: Folder[]
  ): Folder[] {
    return allFolders.filter(
      folder => PathService.getParentPath(folder.path) === parentFolderPath
    )
  }

  /**
   * 子ノートを取得
   */
  static getChildNotes(folderPath: string, allNotes: Note[]): Note[] {
    return allNotes.filter(note => note.folderPath === folderPath)
  }

  /**
   * フォルダとその子孫を全て取得
   */
  static getAllDescendantFolders(
    folderPath: string,
    allFolders: Folder[]
  ): Folder[] {
    const descendants: Folder[] = []
    const queue = [folderPath]

    while (queue.length > 0) {
      const currentPath = queue.shift()!
      const children = this.getChildFolders(currentPath, allFolders)
      descendants.push(...children)
      queue.push(...children.map(f => f.path))
    }

    return descendants
  }
}
```

**3. Application層: NoteListUseCases.ts**

```typescript
// app/screen/note-list/application/NoteListUseCases.ts

export class NoteListUseCases {
  /**
   * 選択されたアイテムを削除
   */
  static async deleteSelectedItems(
    noteIds: string[],
    folderIds: string[]
  ): Promise<void> {
    // 1. フォルダの子孫を全て取得
    const allFolders = await FolderRepository.getAll()
    const allNotes = await NoteRepository.getAll()

    const foldersToDelete = new Set<string>(folderIds)
    for (const folderId of folderIds) {
      const folder = allFolders.find(f => f.id === folderId)
      if (!folder) continue

      const descendants = FolderDomainService.getAllDescendantFolders(
        folder.path,
        allFolders
      )
      descendants.forEach(d => foldersToDelete.add(d.id))
    }

    // 2. フォルダ内のノートを全て取得
    const notesToDelete = new Set<string>(noteIds)
    for (const folderId of foldersToDelete) {
      const folder = allFolders.find(f => f.id === folderId)
      if (!folder) continue

      const childNotes = FolderDomainService.getChildNotes(folder.path, allNotes)
      childNotes.forEach(n => notesToDelete.add(n.id))
    }

    // 3. 一括削除（トランザクション的に実行）
    await Promise.all([
      NoteRepository.batchDelete(Array.from(notesToDelete)),
      FolderRepository.batchDelete(Array.from(foldersToDelete)),
    ])
  }

  /**
   * フォルダをリネーム（子要素のパスも更新）
   */
  static async renameFolder(
    folderId: string,
    newName: string
  ): Promise<void> {
    // 1. バリデーション
    const validation = FolderDomainService.validateFolderName(newName)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // 2. フォルダを取得
    const allFolders = await FolderRepository.getAll()
    const folder = allFolders.find(f => f.id === folderId)
    if (!folder) {
      throw new Error('フォルダが見つかりません')
    }

    // 3. 新しいパスを生成
    const parentPath = PathService.getParentPath(folder.path)
    const newPath = PathService.joinPaths(parentPath, newName)

    // 4. 重複チェック
    const duplicate = allFolders.find(f => f.path === newPath && f.id !== folderId)
    if (duplicate) {
      throw new Error('同じ名前のフォルダが既に存在します')
    }

    // 5. 子フォルダと子ノートのパスを更新
    const oldPath = folder.path
    const descendants = FolderDomainService.getAllDescendantFolders(
      oldPath,
      allFolders
    )

    const allNotes = await NoteRepository.getAll()
    const allChildNotes = [
      ...FolderDomainService.getChildNotes(oldPath, allNotes),
      ...descendants.flatMap(d =>
        FolderDomainService.getChildNotes(d.path, allNotes)
      ),
    ]

    const updatedFolders = [
      { ...folder, path: newPath, name: newName },
      ...descendants.map(d => ({
        ...d,
        path: d.path.replace(oldPath, newPath),
      })),
    ]

    const updatedNotes = allChildNotes.map(note => ({
      ...note,
      folderPath: note.folderPath.replace(oldPath, newPath),
    }))

    // 6. 一括更新（トランザクション的に実行）
    await Promise.all([
      FolderRepository.batchUpdate(updatedFolders),
      NoteRepository.batchUpdate(updatedNotes),
    ])

    // 7. AsyncStorageの書き込み完了を待機
    // → この後 refreshData() を呼ぶことで、確実に最新データを取得
  }

  /**
   * 選択されたアイテムを移動
   */
  static async moveSelectedItems(
    noteIds: string[],
    folderIds: string[],
    targetFolderPath: string
  ): Promise<void> {
    // 1. バリデーション
    const noteValidation = await NoteDomainService.validateMoveOperation(
      noteIds,
      targetFolderPath
    )
    if (!noteValidation.valid) {
      throw new Error(noteValidation.errors.join('\n'))
    }

    // 2. ノートを移動
    const allNotes = await NoteRepository.getAll()
    const updatedNotes = noteIds.map(noteId => {
      const note = allNotes.find(n => n.id === noteId)
      if (!note) throw new Error(`ノート ${noteId} が見つかりません`)
      return {
        ...note,
        folderPath: targetFolderPath,
      }
    })

    // 3. フォルダを移動
    const allFolders = await FolderRepository.getAll()
    const foldersToMove: Folder[] = []
    const notesInFolders: Note[] = []

    for (const folderId of folderIds) {
      const folder = allFolders.find(f => f.id === folderId)
      if (!folder) continue

      const newPath = PathService.joinPaths(targetFolderPath, folder.name)
      foldersToMove.push({ ...folder, path: newPath })

      // 子孫フォルダも移動
      const descendants = FolderDomainService.getAllDescendantFolders(
        folder.path,
        allFolders
      )
      foldersToMove.push(
        ...descendants.map(d => ({
          ...d,
          path: d.path.replace(folder.path, newPath),
        }))
      )

      // フォルダ内のノートも移動
      const childNotes = FolderDomainService.getChildNotes(folder.path, allNotes)
      notesInFolders.push(
        ...childNotes.map(n => ({
          ...n,
          folderPath: n.folderPath.replace(folder.path, newPath),
        }))
      )
    }

    // 4. 一括更新
    await Promise.all([
      NoteRepository.batchUpdate([...updatedNotes, ...notesInFolders]),
      FolderRepository.batchUpdate(foldersToMove),
    ])
  }
}
```

**4. Infrastructure層: NoteRepository.ts**

```typescript
// app/screen/note-list/infrastructure/NoteRepository.ts

export class NoteRepository {
  /**
   * 全ノートを取得
   */
  static async getAll(): Promise<Note[]> {
    return await NoteListStorage.getAllNotes()
  }

  /**
   * ノートを保存
   */
  static async save(note: Note): Promise<void> {
    await NoteListStorage.createNote(note)
  }

  /**
   * ノートを更新
   */
  static async update(note: Note): Promise<void> {
    await NoteListStorage.updateNote(note)
  }

  /**
   * ノートを削除
   */
  static async delete(noteId: string): Promise<void> {
    const allNotes = await this.getAll()
    const remaining = allNotes.filter(n => n.id !== noteId)
    await this.saveAll(remaining)
  }

  /**
   * 複数ノートを一括削除
   */
  static async batchDelete(noteIds: string[]): Promise<void> {
    const allNotes = await this.getAll()
    const remaining = allNotes.filter(n => !noteIds.includes(n.id))
    await this.saveAll(remaining)
  }

  /**
   * 複数ノートを一括更新
   */
  static async batchUpdate(notes: Note[]): Promise<void> {
    const allNotes = await this.getAll()
    const noteMap = new Map(notes.map(n => [n.id, n]))

    const updated = allNotes.map(n => noteMap.get(n.id) || n)
    await this.saveAll(updated)
  }

  /**
   * 全ノートを保存（内部用）
   */
  private static async saveAll(notes: Note[]): Promise<void> {
    await storage.saveAllNotes(notes)
  }
}
```

**5. Infrastructure層: FolderRepository.ts**

```typescript
// app/screen/note-list/infrastructure/FolderRepository.ts

export class FolderRepository {
  static async getAll(): Promise<Folder[]> {
    return await NoteListStorage.getAllFolders()
  }

  static async save(folder: Folder): Promise<void> {
    await NoteListStorage.createFolder(folder)
  }

  static async update(folder: Folder): Promise<void> {
    await NoteListStorage.updateFolder(folder)
  }

  static async batchDelete(folderIds: string[]): Promise<void> {
    const allFolders = await this.getAll()
    const remaining = allFolders.filter(f => !folderIds.includes(f.id))
    await this.saveAll(remaining)
  }

  static async batchUpdate(folders: Folder[]): Promise<void> {
    const allFolders = await this.getAll()
    const folderMap = new Map(folders.map(f => [f.id, f]))

    const updated = allFolders.map(f => folderMap.get(f.id) || f)
    await this.saveAll(updated)
  }

  private static async saveAll(folders: Folder[]): Promise<void> {
    await storage.saveAllFolders(folders)
  }
}
```

**利点:**

1. **責務の明確化**: Domain、Application、Infrastructureで役割分担
2. **テスタビリティ向上**: 各層を独立してテスト可能
3. **保守性向上**: 変更の影響範囲が限定される
4. **再利用性**: ビジネスロジックを他の画面でも利用可能

---

### 2.3 非同期処理の改善（AsyncStorageの競合解消）

#### 現状の問題
- `Promise.all()` で書き込み後、即座に `refreshTree()` を実行
- AsyncStorageの書き込み完了前に読み込みが実行され、古いデータを取得

#### 改善案: 書き込み完了の確実な待機

**修正前:**

```typescript
// NoteService.updateFolder() での問題あるコード
await Promise.all([
  saveAllNotes(updatedNotes),
  saveAllFolders(updatedFolders),
])
// ここで即座に refreshTree() が呼ばれるが、
// AsyncStorageの書き込みが完了していない可能性
```

**修正後:**

```typescript
// NoteListUseCases.renameFolder()
await Promise.all([
  FolderRepository.batchUpdate(updatedFolders),
  NoteRepository.batchUpdate(updatedNotes),
])
// AsyncStorageの書き込みが完了するまで待機

// この後、Context の refreshData() を呼ぶ
// refreshData() は新たに getAllFolders() と getAllNotes() を実行するため、
// 確実に最新のデータを取得できる
```

**Contextでの実装:**

```typescript
// NoteListProvider.tsx

const refreshData = useCallback(async () => {
  dispatch({ type: 'SET_LOADING', payload: true })
  try {
    // AsyncStorageから確実にデータを取得
    // batchUpdate() の await が完了した後に呼ばれるため、
    // 確実に最新データが取得できる
    const [folders, notes] = await Promise.all([
      FolderRepository.getAll(),
      NoteRepository.getAll(),
    ])

    // データ更新と状態リセットを一括実行
    dispatch({ type: 'REFRESH_COMPLETE', payload: { folders, notes } })
  } catch (error) {
    dispatch({ type: 'SET_LOADING', payload: false })
    throw error
  }
}, [])
```

**利用側:**

```typescript
// useNoteList.ts（または直接コンポーネント内）

const handleRename = async (folderId: string, newName: string) => {
  try {
    // 1. UseCaseを実行（AsyncStorage書き込みが完了するまで待機）
    await NoteListUseCases.renameFolder(folderId, newName)

    // 2. refreshData() でデータを再取得
    // この時点で AsyncStorage の書き込みは完了しているため、
    // 確実に最新データが取得できる
    await refreshData()
  } catch (error) {
    // エラー処理
  }
}
```

**利点:**

1. **競合状態の解消**: 書き込み完了を確実に待機してから読み込み
2. **データ整合性の保証**: 古いデータと新しいデータの混在を防止
3. **バグの解消**: フォルダリネーム時に子要素が消える問題を解決

---

### 2.4 パフォーマンス最適化

#### 改善案1: ツリー構造の差分更新

**現状:**
- `buildTree()` が毎回全データから再構築

**改善:**
- 変更部分のみ更新

```typescript
// utils/treeUtils.ts に追加

/**
 * フォルダの展開/折りたたみのみの場合、該当ノードの children のみ再構築
 */
export function updateTreeNodeChildren(
  treeNodes: TreeNode[],
  folderId: string,
  isExpanded: boolean,
  allFolders: Folder[],
  allNotes: Note[]
): TreeNode[] {
  return treeNodes.map(node => {
    if (node.type === 'folder' && node.item.id === folderId) {
      return {
        ...node,
        children: isExpanded
          ? buildChildrenNodes(node.item.path, allFolders, allNotes, new Set(), node.level + 1)
          : [],
      }
    }
    if (node.children) {
      return {
        ...node,
        children: updateTreeNodeChildren(
          node.children,
          folderId,
          isExpanded,
          allFolders,
          allNotes
        ),
      }
    }
    return node
  })
}
```

**Reducer内での利用:**

```typescript
case 'TOGGLE_FOLDER': {
  const newExpanded = new Set(state.expandedFolderIds)
  const isExpanding = !newExpanded.has(action.payload)

  if (isExpanding) {
    newExpanded.add(action.payload)
  } else {
    newExpanded.delete(action.payload)
  }

  return {
    ...state,
    expandedFolderIds: newExpanded,
    // 差分更新
    treeNodes: updateTreeNodeChildren(
      state.treeNodes,
      action.payload,
      isExpanding,
      state.folders,
      state.notes
    ),
  }
}
```

#### 改善案2: 検索結果のキャッシング

```typescript
// Reducer内で検索結果をキャッシュ

interface NoteListState {
  // ... 他の状態
  search: {
    isActive: boolean
    query: string
    options: SearchOptions
    cachedResults: Map<string, TreeNode[]> // キャッシュ
  }
}

case 'UPDATE_SEARCH_QUERY': {
  const cacheKey = `${action.payload}:${JSON.stringify(state.search.options)}`

  // キャッシュに存在すれば再利用
  if (state.search.cachedResults.has(cacheKey)) {
    return {
      ...state,
      search: {
        ...state.search,
        query: action.payload,
      },
    }
  }

  // キャッシュに存在しない場合は新規計算
  const filteredNodes = filterTreeNodes(
    state.treeNodes,
    action.payload,
    state.search.options
  )

  const newCache = new Map(state.search.cachedResults)
  newCache.set(cacheKey, filteredNodes)

  return {
    ...state,
    search: {
      ...state.search,
      query: action.payload,
      cachedResults: newCache,
    },
  }
}
```

---

## 3. 段階的な移行計画

リファクタリングは以下の5フェーズで段階的に実施します。

### Phase 1: 基盤整備（1-2日）

**目標:** 新しいアーキテクチャの土台を作成

**作業内容:**
1. Repository層の作成
   - `NoteRepository.ts`
   - `FolderRepository.ts`
2. Domain層の作成
   - `NoteDomainService.ts`
   - `FolderDomainService.ts`
3. Application層の作成
   - `NoteListUseCases.ts`
4. 単体テストの作成

**成果物:**
- `app/screen/note-list/infrastructure/`
- `app/screen/note-list/domain/`
- `app/screen/note-list/application/`
- `app/screen/note-list/__tests__/domain/`
- `app/screen/note-list/__tests__/application/`

---

### Phase 2: 状態管理の一元化（2-3日）

**目標:** useReducer + Context で状態を一元管理

**作業内容:**
1. Context の作成
   - `NoteListContext.tsx`
   - `NoteListProvider.tsx`
   - `noteListReducer.ts`
2. カスタムフックの作成
   - `useNoteListContext.ts`
3. 既存の状態管理と並行稼働
   - 既存のHooksは残したまま、新しいContextを導入

**成果物:**
- `app/screen/note-list/context/`
- `app/screen/note-list/__tests__/context/`

---

### Phase 3: 非同期処理の改善（1-2日）

**目標:** AsyncStorageの競合状態を解消

**作業内容:**
1. `refreshData()` の実装
2. `renameFolder` の修正
3. フォルダリネームバグの修正確認

**成果物:**
- Issue #010 の解決
- 統合テストの追加

---

### Phase 4: 既存Hooksの段階的移行（3-4日）

**目標:** 既存のカスタムフックを新しいContextに置き換え

**作業内容:**
1. `useNoteList` を Context 利用に書き換え
2. `useItemActions` を UseCases 利用に書き換え
3. `useNoteTree`, `useItemSelection`, `useModalManager` を削除
4. 各コンポーネントで Context を直接利用

**成果物:**
- `app/screen/note-list/hooks/` の大幅な削減
- `NoteListScreen.tsx` のシンプル化

---

### Phase 5: パフォーマンス最適化（1-2日）

**目標:** ツリー構造の差分更新と検索キャッシング

**作業内容:**
1. `updateTreeNodeChildren()` の実装
2. 検索結果キャッシングの実装
3. パフォーマンステストの実施

**成果物:**
- `utils/treeUtils.ts` の拡張
- パフォーマンス改善レポート

---

### Phase 6: NoteServiceの廃止（1日）

**目標:** 既存のNoteServiceを完全に削除

**作業内容:**
1. NoteService への依存を全て削除
2. ファイルの削除
3. 最終テスト

**成果物:**
- `services/noteService.ts` の削除
- 完全なリファクタリング完了

---

## 4. テスト戦略

### 4.1 単体テスト

**Domain層:**
```typescript
// __tests__/domain/NoteDomainService.test.ts

describe('NoteDomainService', () => {
  describe('validateNoteName', () => {
    it('空のノート名は無効', () => {
      const result = NoteDomainService.validateNoteName('')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('ノート名を入力してください')
    })

    it('100文字以内は有効', () => {
      const result = NoteDomainService.validateNoteName('テストノート')
      expect(result.valid).toBe(true)
    })
  })

  describe('checkDuplicate', () => {
    it('重複ノートを検出', async () => {
      // テストデータのセットアップ
      jest.spyOn(NoteRepository, 'getAll').mockResolvedValue([
        { id: '1', title: '既存ノート', folderPath: '/folder1' },
      ])

      const result = await NoteDomainService.checkDuplicate(
        '既存ノート',
        '/folder1'
      )

      expect(result.isDuplicate).toBe(true)
    })
  })
})
```

**Reducer:**
```typescript
// __tests__/context/noteListReducer.test.ts

describe('noteListReducer', () => {
  it('TOGGLE_FOLDER でフォルダを展開', () => {
    const initialState = {
      ...createInitialState(),
      expandedFolderIds: new Set(),
    }

    const action = { type: 'TOGGLE_FOLDER', payload: 'folder-1' }
    const newState = noteListReducer(initialState, action)

    expect(newState.expandedFolderIds.has('folder-1')).toBe(true)
  })

  it('EXIT_SELECTION_MODE で選択状態をクリア', () => {
    const initialState = {
      ...createInitialState(),
      isSelectionMode: true,
      selectedNoteIds: new Set(['note-1']),
    }

    const action = { type: 'EXIT_SELECTION_MODE' }
    const newState = noteListReducer(initialState, action)

    expect(newState.isSelectionMode).toBe(false)
    expect(newState.selectedNoteIds.size).toBe(0)
  })
})
```

### 4.2 統合テスト

```typescript
// __tests__/integration/renameFolder.test.ts

describe('フォルダリネームの統合テスト', () => {
  it('フォルダリネーム後も子要素が表示される', async () => {
    // 1. テストデータのセットアップ
    const folders = [
      { id: 'f1', path: '/parent', name: 'parent' },
      { id: 'f2', path: '/parent/child', name: 'child' },
    ]
    const notes = [
      { id: 'n1', folderPath: '/parent', title: 'Note1' },
      { id: 'n2', folderPath: '/parent/child', title: 'Note2' },
    ]

    await FolderRepository.saveAll(folders)
    await NoteRepository.saveAll(notes)

    // 2. リネーム実行
    await NoteListUseCases.renameFolder('f1', 'parent_new')

    // 3. データ取得
    const updatedFolders = await FolderRepository.getAll()
    const updatedNotes = await NoteRepository.getAll()

    // 4. 検証
    expect(updatedFolders.find(f => f.id === 'f1')?.path).toBe('/parent_new')
    expect(updatedFolders.find(f => f.id === 'f2')?.path).toBe('/parent_new/child')
    expect(updatedNotes.find(n => n.id === 'n1')?.folderPath).toBe('/parent_new')
    expect(updatedNotes.find(n => n.id === 'n2')?.folderPath).toBe('/parent_new/child')
  })
})
```

---

## 5. マイグレーションガイド

### 5.1 既存コードからの移行例

**移行前:**

```typescript
// NoteListScreen.tsx (旧)

const noteList = useNoteList({
  navigation,
  onNavigateToEdit: (noteId) => {
    navigation.navigate('NoteEdit', { noteId })
  },
})

const handleDelete = async () => {
  await noteList.actions.handleDeleteSelected()
}
```

**移行後:**

```typescript
// NoteListScreen.tsx (新)

const { state, dispatch, actions } = useNoteListContext()

const handleDelete = async () => {
  try {
    await NoteListUseCases.deleteSelectedItems(
      Array.from(state.selectedNoteIds),
      Array.from(state.selectedFolderIds)
    )
    await actions.refreshData()
  } catch (error) {
    // エラー処理
  }
}
```

### 5.2 破壊的変更のリスト

本リファクタリングでは以下の破壊的変更が発生します：

1. **カスタムフックの削除:**
   - `useNoteList` → `useNoteListContext` に置き換え
   - `useItemSelection` → Context 内の state に統合
   - `useItemActions` → UseCases に置き換え

2. **NoteService の削除:**
   - 全ての `NoteService.*` 呼び出しを `NoteListUseCases.*` に置き換え

3. **状態の型変更:**
   - 複数の独立した状態 → 単一の `NoteListState`

---

## 6. 期待される効果

### 6.1 定量的効果

| 項目 | 現状 | 目標 | 改善率 |
|------|------|------|--------|
| ファイル数 | 22個 | 18個 | -18% |
| 最大ファイル行数 | 455行 | 250行 | -45% |
| カスタムHooks数 | 8個 | 1個 | -87% |
| 状態管理の分散度 | HIGH | LOW | - |

### 6.2 定性的効果

1. **保守性の向上:**
   - 単一責任原則に基づく明確な責務分担
   - 変更の影響範囲が限定される

2. **バグの減少:**
   - 状態の整合性が保証される
   - AsyncStorageの競合状態が解消される

3. **開発速度の向上:**
   - 新機能追加時の実装箇所が明確
   - テストが容易になり、品質が向上

4. **学習コストの低下:**
   - アーキテクチャが標準的な3層構造
   - データフローが明確

---

## 7. リスク管理

### 7.1 想定されるリスク

| リスク | 確率 | 影響度 | 対策 |
|--------|------|--------|------|
| 既存機能の破壊 | 中 | 高 | 段階的移行、並行稼働、十分なテスト |
| パフォーマンス悪化 | 低 | 中 | パフォーマンステストの実施 |
| スケジュール遅延 | 中 | 中 | 各フェーズごとにチェックポイント設定 |

### 7.2 ロールバック計画

各フェーズ完了時にコミットを作成し、問題が発生した場合は即座にロールバック可能にします。

---

## 8. まとめ

本リファクタリング計画により、note-list画面の状態管理を以下のように改善します：

1. **状態の一元化**: useReducer + Context で Single Source of Truth を確立
2. **責務の分割**: 3層アーキテクチャで明確な役割分担
3. **非同期処理の改善**: AsyncStorage の競合状態を解消
4. **段階的移行**: 既存機能を壊さず、6フェーズで安全に移行

これにより、保守性・テスタビリティ・パフォーマンスが大幅に向上し、
今後の機能追加や変更が容易になります。

---

## 次のステップ

承認が得られ次第、Phase 1 から実装を開始します。
