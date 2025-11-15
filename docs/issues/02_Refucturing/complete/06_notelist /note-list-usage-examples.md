# Note-List 新アーキテクチャ 使用例

## 実行日
2025-10-21

## 目的
新しい3層アーキテクチャ + Context状態管理の使用方法を示す

---

## 1. アーキテクチャ概要

新しいアーキテクチャは以下の層で構成されています：

```
┌────────────────────────────────────┐
│  UI層 (Components)                  │
│  - useNoteListContext() を使用      │
└────────────────────────────────────┘
              ↓
┌────────────────────────────────────┐
│  Context層 (State Management)       │
│  - NoteListProvider                │
│  - useReducer + Context            │
│  - 状態の一元管理                   │
└────────────────────────────────────┘
              ↓
┌────────────────────────────────────┐
│  Application層 (Use Cases)          │
│  - NoteListUseCases                │
│  - ビジネスロジックの実行           │
└────────────────────────────────────┘
              ↓
┌────────────────────────────────────┐
│  Domain層 (Business Logic)          │
│  - NoteDomainService               │
│  - FolderDomainService             │
│  - バリデーション、重複チェック     │
└────────────────────────────────────┘
              ↓
┌────────────────────────────────────┐
│  Infrastructure層 (Data Access)     │
│  - NoteRepository                  │
│  - FolderRepository                │
│  - AsyncStorageへのアクセス         │
└────────────────────────────────────┘
```

---

## 2. 基本的な使用方法

### 2.1 Providerでラップ

アプリケーションのルートまたはNoteListScreen全体をProviderでラップします：

```typescript
// App.tsx または NoteListScreen.tsx
import { NoteListProvider } from './context';

function App() {
  return (
    <NoteListProvider>
      <NoteListScreen />
    </NoteListProvider>
  );
}
```

### 2.2 Contextの使用

コンポーネント内でContextを使用します：

```typescript
import { useNoteListContext } from './context';

function NoteListScreen() {
  const { state, dispatch, actions } = useNoteListContext();

  // 状態の取得
  const { folders, notes, treeNodes, loading } = state;
  const { isSelectionMode, selectedNoteIds } = state;

  // アクションの実行
  const handleRefresh = async () => {
    await actions.refreshData();
  };

  // Dispatchで状態を直接変更
  const handleToggleFolder = (folderId: string) => {
    dispatch({ type: 'TOGGLE_FOLDER', payload: folderId });
  };

  return (
    <View>
      {loading && <ActivityIndicator />}
      <FlatList
        data={treeNodes}
        renderItem={({ item }) => (
          <TreeListItem
            node={item}
            onPress={() => handleToggleFolder(item.id)}
          />
        )}
      />
    </View>
  );
}
```

---

## 3. 主要な操作例

### 3.1 データの読み込み

```typescript
import { useNoteListContext } from './context';
import { useEffect } from 'react';

function NoteListScreen() {
  const { actions } = useNoteListContext();

  useEffect(() => {
    // 初回読み込み
    actions.refreshData();
  }, [actions]);

  return <View>{/* ... */}</View>;
}
```

### 3.2 フォルダのリネーム

**旧コード:**

```typescript
// 既存のuseItemActions使用
const handleRename = async () => {
  await itemActions.handleRenameItem(folder, newName);
  // refreshTree() が内部で呼ばれるが、AsyncStorageの競合が発生
};
```

**新コード:**

```typescript
import { useNoteListContext } from './context';

function RenameModal() {
  const { actions } = useNoteListContext();

  const handleRename = async (folderId: string, newName: string) => {
    try {
      // 1. UseCaseを実行（AsyncStorage書き込みが完了するまで待機）
      // 2. 自動的に refreshData() が実行される
      // 3. 確実に最新データが取得される
      await actions.renameFolder(folderId, newName);

      // 成功
      Alert.alert('成功', 'フォルダ名を変更しました');
    } catch (error) {
      // エラーハンドリング
      Alert.alert('エラー', error.message);
    }
  };

  return <View>{/* ... */}</View>;
}
```

**重要なポイント:**
- `actions.renameFolder()` 内部で自動的に `refreshData()` が実行される
- AsyncStorageの書き込み完了後に読み込みが実行されるため、競合状態が発生しない
- **これがIssue #010のフォルダリネームバグの根本解決**

### 3.3 アイテムの削除

```typescript
import { useNoteListContext } from './context';

function DeleteButton() {
  const { state, actions } = useNoteListContext();
  const { selectedNoteIds, selectedFolderIds } = state;

  const handleDelete = async () => {
    try {
      await actions.deleteSelectedItems(
        Array.from(selectedNoteIds),
        Array.from(selectedFolderIds)
      );

      Alert.alert('成功', '削除しました');
    } catch (error) {
      Alert.alert('エラー', error.message);
    }
  };

  return (
    <Button
      title="削除"
      onPress={handleDelete}
      disabled={selectedNoteIds.size === 0 && selectedFolderIds.size === 0}
    />
  );
}
```

### 3.4 アイテムの移動

```typescript
import { useNoteListContext } from './context';

function MoveButton() {
  const { state, actions } = useNoteListContext();
  const { selectedNoteIds, selectedFolderIds } = state;

  const handleMove = async (targetFolderPath: string) => {
    try {
      await actions.moveSelectedItems(
        Array.from(selectedNoteIds),
        Array.from(selectedFolderIds),
        targetFolderPath
      );

      Alert.alert('成功', '移動しました');
    } catch (error) {
      Alert.alert('エラー', error.message);
    }
  };

  return <View>{/* ... */}</View>;
}
```

### 3.5 フォルダの展開/折りたたみ

```typescript
import { useNoteListContext } from './context';

function TreeListItem({ node }: { node: TreeNode }) {
  const { dispatch } = useNoteListContext();

  const handleToggle = () => {
    if (node.type === 'folder') {
      dispatch({ type: 'TOGGLE_FOLDER', payload: node.id });
    }
  };

  return (
    <TouchableOpacity onPress={handleToggle}>
      <Text>{node.item.name}</Text>
      {node.isExpanded && <FolderIcon name="folder-open" />}
    </TouchableOpacity>
  );
}
```

### 3.6 選択モードの切り替え

```typescript
import { useNoteListContext } from './context';

function SelectionModeButton() {
  const { state, dispatch } = useNoteListContext();
  const { isSelectionMode } = state;

  const handleToggleSelectionMode = () => {
    if (isSelectionMode) {
      dispatch({ type: 'EXIT_SELECTION_MODE' });
    } else {
      dispatch({ type: 'ENTER_SELECTION_MODE' });
    }
  };

  return (
    <Button
      title={isSelectionMode ? '選択解除' : '選択モード'}
      onPress={handleToggleSelectionMode}
    />
  );
}
```

### 3.7 アイテムの選択

```typescript
import { useNoteListContext } from './context';

function TreeListItem({ node }: { node: TreeNode }) {
  const { state, dispatch } = useNoteListContext();
  const { isSelectionMode, selectedNoteIds, selectedFolderIds } = state;

  const isSelected =
    node.type === 'note'
      ? selectedNoteIds.has(node.id)
      : selectedFolderIds.has(node.id);

  const handleSelect = () => {
    if (!isSelectionMode) return;

    if (node.type === 'note') {
      dispatch({ type: 'TOGGLE_SELECT_NOTE', payload: node.id });
    } else {
      dispatch({ type: 'TOGGLE_SELECT_FOLDER', payload: node.id });
    }
  };

  return (
    <TouchableOpacity onPress={handleSelect}>
      {isSelectionMode && <Checkbox checked={isSelected} />}
      <Text>{node.type === 'note' ? node.item.title : node.item.name}</Text>
    </TouchableOpacity>
  );
}
```

### 3.8 検索機能

```typescript
import { useNoteListContext } from './context';

function SearchBar() {
  const { state, dispatch } = useNoteListContext();
  const { search } = state;

  const handleStartSearch = () => {
    dispatch({
      type: 'START_SEARCH',
      payload: {
        query: '',
        options: {
          target: 'all',
          field: 'title',
          caseSensitive: false,
        },
      },
    });
  };

  const handleUpdateQuery = (query: string) => {
    dispatch({ type: 'UPDATE_SEARCH_QUERY', payload: query });
  };

  const handleEndSearch = () => {
    dispatch({ type: 'END_SEARCH' });
  };

  return (
    <View>
      {!search.isActive ? (
        <Button title="検索" onPress={handleStartSearch} />
      ) : (
        <>
          <TextInput
            value={search.query}
            onChangeText={handleUpdateQuery}
            placeholder="検索..."
          />
          <Button title="閉じる" onPress={handleEndSearch} />
        </>
      )}
    </View>
  );
}
```

### 3.9 モーダルの表示

```typescript
import { useNoteListContext } from './context';

function CreateButton() {
  const { state, dispatch } = useNoteListContext();
  const { modals } = state;

  const handleOpenCreateModal = () => {
    dispatch({ type: 'OPEN_CREATE_MODAL' });
  };

  const handleCloseCreateModal = () => {
    dispatch({ type: 'CLOSE_CREATE_MODAL' });
  };

  return (
    <>
      <Button title="新規作成" onPress={handleOpenCreateModal} />
      <CreateItemModal
        visible={modals.create.visible}
        onClose={handleCloseCreateModal}
      />
    </>
  );
}
```

---

## 4. 既存コードからの移行例

### 4.1 useNoteListの置き換え

**旧コード:**

```typescript
import { useNoteList } from './hooks/useNoteList';

function NoteListScreen({ navigation }) {
  const noteList = useNoteList({
    navigation,
    onNavigateToEdit: (noteId) => {
      navigation.navigate('NoteEdit', { noteId });
    },
  });

  const { treeNodes, loading } = noteList.tree;
  const { isSelectionMode } = noteList.selection;

  return <View>{/* ... */}</View>;
}
```

**新コード:**

```typescript
import { NoteListProvider, useNoteListContext } from './context';

function NoteListScreenContent({ navigation }) {
  const { state } = useNoteListContext();
  const { treeNodes, loading, isSelectionMode } = state;

  return <View>{/* ... */}</View>;
}

function NoteListScreen({ navigation }) {
  return (
    <NoteListProvider>
      <NoteListScreenContent navigation={navigation} />
    </NoteListProvider>
  );
}
```

### 4.2 useItemActionsの置き換え

**旧コード:**

```typescript
import { useItemActions } from './hooks/useItemActions';

function ActionButtons() {
  const itemActions = useItemActions({
    onSuccess: () => {
      // refreshTree() が内部で呼ばれる
    },
  });

  const handleDelete = async () => {
    await itemActions.handleDeleteSelected();
  };

  return <Button title="削除" onPress={handleDelete} />;
}
```

**新コード:**

```typescript
import { useNoteListContext } from './context';

function ActionButtons() {
  const { state, actions } = useNoteListContext();

  const handleDelete = async () => {
    try {
      await actions.deleteSelectedItems(
        Array.from(state.selectedNoteIds),
        Array.from(state.selectedFolderIds)
      );
    } catch (error) {
      Alert.alert('エラー', error.message);
    }
  };

  return <Button title="削除" onPress={handleDelete} />;
}
```

---

## 5. Direct API使用（高度な使い方）

Contextを使わず、直接Repository/UseCase/Domainを使用することもできます：

### 5.1 Repositoryの直接使用

```typescript
import { NoteRepository, FolderRepository } from './infrastructure';

async function loadData() {
  const notes = await NoteRepository.getAll();
  const folders = await FolderRepository.getAll();
  return { notes, folders };
}
```

### 5.2 Domain Serviceの直接使用

```typescript
import { NoteDomainService, FolderDomainService } from './domain';

async function validateAndCreate(name: string, parentPath: string) {
  // バリデーション
  const validation = FolderDomainService.validateFolderName(name);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 重複チェック
  const { isDuplicate } = await FolderDomainService.checkDuplicate(
    name,
    parentPath
  );
  if (isDuplicate) {
    throw new Error('同じ名前のフォルダが既に存在します');
  }

  // 作成
  return await FolderRepository.create({ name, path: parentPath });
}
```

### 5.3 UseCaseの直接使用

```typescript
import { NoteListUseCases } from './application';

async function renameAndRefresh(folderId: string, newName: string) {
  // 1. UseCaseを実行
  await NoteListUseCases.renameFolder(folderId, newName);

  // 2. データを再取得
  const folders = await FolderRepository.getAll();
  const notes = await NoteRepository.getAll();

  return { folders, notes };
}
```

---

## 6. エラーハンドリング

全てのアクションはエラーをスローするため、try-catchでハンドリングします：

```typescript
import { useNoteListContext } from './context';

function ActionButton() {
  const { actions } = useNoteListContext();
  const [error, setError] = useState<string | null>(null);

  const handleAction = async () => {
    try {
      setError(null);
      await actions.renameFolder('folder-id', 'New Name');
      Alert.alert('成功', '名前を変更しました');
    } catch (error) {
      const message = error instanceof Error ? error.message : '不明なエラー';
      setError(message);
      Alert.alert('エラー', message);
    }
  };

  return (
    <View>
      <Button title="リネーム" onPress={handleAction} />
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
    </View>
  );
}
```

---

## 7. テストの書き方

### 7.1 Reducerのテスト

```typescript
import { noteListReducer, createInitialState } from './context';

describe('noteListReducer', () => {
  it('TOGGLE_FOLDER でフォルダを展開', () => {
    const initialState = createInitialState();
    const action = { type: 'TOGGLE_FOLDER', payload: 'folder-1' };
    const newState = noteListReducer(initialState, action);

    expect(newState.expandedFolderIds.has('folder-1')).toBe(true);
  });

  it('EXIT_SELECTION_MODE で選択状態をクリア', () => {
    const initialState = {
      ...createInitialState(),
      isSelectionMode: true,
      selectedNoteIds: new Set(['note-1']),
    };

    const action = { type: 'EXIT_SELECTION_MODE' };
    const newState = noteListReducer(initialState, action);

    expect(newState.isSelectionMode).toBe(false);
    expect(newState.selectedNoteIds.size).toBe(0);
  });
});
```

### 7.2 Domain Serviceのテスト

```typescript
import { NoteDomainService } from './domain';
import { NoteRepository } from './infrastructure';

describe('NoteDomainService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('空のノート名は無効', () => {
    const result = NoteDomainService.validateNoteName('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('ノート名を入力してください');
  });

  it('重複ノートを検出', async () => {
    jest.spyOn(NoteRepository, 'getAll').mockResolvedValue([
      {
        id: '1',
        title: '既存ノート',
        path: '/folder1/',
        content: '',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      },
    ]);

    const result = await NoteDomainService.checkDuplicate(
      '既存ノート',
      '/folder1/'
    );

    expect(result.isDuplicate).toBe(true);
  });
});
```

---

## 8. まとめ

新しいアーキテクチャの主な利点：

1. **状態の一元管理**: useReducer + Contextで全状態が1箇所で管理される
2. **非同期処理の改善**: AsyncStorageの競合状態が解消される
3. **責務の分離**: Domain/Application/Infrastructureで明確に分離
4. **テスタビリティ**: 各層を独立してテスト可能
5. **保守性**: 変更の影響範囲が限定される
6. **型安全性**: TypeScriptで厳密に型付け

**フォルダリネームバグの解決:**

```typescript
// 旧: AsyncStorageの競合が発生
await NoteService.updateFolder(folderId, newName);
refreshTree(); // 書き込み完了前に読み込みが実行される可能性

// 新: 確実に書き込み完了を待機
await actions.renameFolder(folderId, newName);
// 内部で UseCaseの実行 → refreshData() が順次実行される
// AsyncStorageの書き込み完了後に読み込みが実行されるため、確実に最新データが取得できる
```

この新しいアーキテクチャにより、note-list画面の状態管理が大幅に改善されました。
