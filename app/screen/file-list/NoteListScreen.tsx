import React, { useCallback, useMemo, useEffect } from 'react';
import { StyleSheet, FlatList, Alert } from 'react-native';
import { useTheme } from '../../design/theme/ThemeContext';
import { useNoteListHeader } from './hooks/useNoteListHeader';
import { useNoteListChatContext } from '../../features/chat/hooks/useNoteListChatContext';
import { NoteListEmptyState } from './components/NoteListEmptyState';
import { OverflowMenu } from './components/OverflowMenu';
import { CreateItemModal } from './components/CreateItemModal';
import { TreeListItem } from './components/TreeListItem';
import { RenameItemModal } from './components/RenameItemModal';
import { MainContainer } from '../../components/MainContainer';
import { useKeyboardHeight } from '../../contexts/KeyboardHeightContext';
import { NoteListProvider, useNoteListContext } from './context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { FileSystemItem, Folder } from '@shared/types/file';

import { Ionicons } from '@expo/vector-icons';
import { useSearch } from './hooks/useSearch';
import { NoteListSearchBar } from './components/NoteListSearchBar';

// 静的スタイル（コンポーネント外部で定義）
const staticStyles = StyleSheet.create({
  centered: { justifyContent: 'center', alignItems: 'center' },
});

function NoteListScreenContent() {
  const { colors, spacing } = useTheme();
  const { keyboardHeight, chatInputBarHeight } = useKeyboardHeight();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  // 新しいContext APIを使用
  const { state, dispatch, actions, items } = useNoteListContext();

  // データ初期読み込み
  useEffect(() => {
    actions.refreshData();
  }, [actions]);

  // 現在のパス（固定値）
  const currentPath = '/';

  const {
    isSearchActive,
    searchQuery,
    setSearchQuery,
    filteredNodes,
    handleCancelSearch,
    handleStartSearch,
  } = useSearch(state.treeNodes);

  // === ハンドラの実装 ===

  /**
   * アイテム選択ハンドラ
   */
  const handleSelectItem = useCallback((item: FileSystemItem) => {
    // 移動モード中
    if (state.isMoveMode) {
      if (item.type === 'folder') {
        const folder = item.item as Folder;
        const targetPath = `${folder.path}/${folder.name}`;
        actions.moveSelectedItems(
          Array.from(state.selectedNoteIds),
          Array.from(state.selectedFolderIds),
          targetPath
        ).then(() => {
          dispatch({ type: 'EXIT_MOVE_MODE' });
          Alert.alert('成功', 'アイテムを移動しました');
        }).catch(error => {
          Alert.alert('エラー', error.message);
        });
      }
      return;
    }

    // 選択モード中
    if (state.isSelectionMode) {
      if (item.type === 'folder') {
        dispatch({ type: 'TOGGLE_SELECT_FOLDER', payload: item.item.id });
      } else {
        dispatch({ type: 'TOGGLE_SELECT_NOTE', payload: item.item.id });
      }
    } else {
      // 通常モード
      if (item.type === 'folder') {
        dispatch({ type: 'TOGGLE_FOLDER', payload: item.item.id });
      } else {
        navigation.navigate('NoteEdit', { noteId: item.item.id });
      }
    }
  }, [
    state.isMoveMode,
    state.isSelectionMode,
    state.selectedNoteIds,
    state.selectedFolderIds,
    actions,
    dispatch,
    navigation,
  ]);

  /**
   * 長押しハンドラ（選択モード開始）
   */
  const handleLongPressItem = useCallback((item: FileSystemItem) => {
    dispatch({ type: 'ENTER_SELECTION_MODE' });
    if (item.type === 'folder') {
      dispatch({ type: 'TOGGLE_SELECT_FOLDER', payload: item.item.id });
    } else {
      dispatch({ type: 'TOGGLE_SELECT_NOTE', payload: item.item.id });
    }
  }, [dispatch]);

  /**
   * 選択解除ハンドラ
   */
  const handleCancelSelection = useCallback(() => {
    dispatch({ type: 'EXIT_SELECTION_MODE' });
  }, [dispatch]);

  /**
   * 削除ハンドラ
   */
  const handleDeleteSelected = useCallback(async () => {
    try {
      await actions.deleteSelectedItems(
        Array.from(state.selectedNoteIds),
        Array.from(state.selectedFolderIds)
      );
      Alert.alert('成功', 'アイテムを削除しました');
    } catch (error: any) {
      Alert.alert('エラー', error.message);
    }
  }, [actions, state.selectedNoteIds, state.selectedFolderIds]);

  /**
   * コピーハンドラ
   */
  const handleCopySelected = useCallback(async () => {
    try {
      await actions.copySelectedNotes(Array.from(state.selectedNoteIds));
      Alert.alert('成功', 'ノートをコピーしました');
    } catch (error: any) {
      Alert.alert('エラー', error.message);
    }
  }, [actions, state.selectedNoteIds]);

  /**
   * 移動モード開始
   */
  const startMoveMode = useCallback(() => {
    if (state.selectedNoteIds.size > 0 || state.selectedFolderIds.size > 0) {
      dispatch({ type: 'ENTER_MOVE_MODE' });
    }
  }, [state.selectedNoteIds, state.selectedFolderIds, dispatch]);

  /**
   * 移動モードキャンセル
   */
  const cancelMoveMode = useCallback(() => {
    dispatch({ type: 'EXIT_MOVE_MODE' });
  }, [dispatch]);

  /**
   * リネームモーダルを開く
   */
  const handleOpenRenameModal = useCallback((id: string, type: 'file' | 'folder') => {
    const item: FileSystemItem | null = type === 'folder'
      ? { type: 'folder', item: state.folders.find(f => f.id === id)! }
      : { type: 'file', item: state.notes.find(n => n.id === id)! };

    if (item && item.item) {
      dispatch({ type: 'OPEN_RENAME_MODAL', payload: item });
    }
  }, [state.folders, state.notes, dispatch]);

  /**
   * リネーム実行
   */
  const handleRename = useCallback(async (newName: string) => {
    if (state.modals.rename.item) {
      try {
        const item = state.modals.rename.item;
        if (item.type === 'folder') {
          await actions.renameFolder(item.item.id, newName);
        } else {
          await actions.renameNote(item.item.id, newName);
        }
        dispatch({ type: 'CLOSE_RENAME_MODAL' });
        Alert.alert('成功', '名前を変更しました');
      } catch (error: any) {
        Alert.alert('エラー', error.message);
      }
    }
  }, [state.modals.rename.item, actions, dispatch]);

  /**
   * 作成実行
   */
  const handleCreate = useCallback(async (inputPath: string) => {
    try {
      const note = await actions.createNoteWithPath(inputPath);
      dispatch({ type: 'CLOSE_CREATE_MODAL' });
      navigation.navigate('NoteEdit', { noteId: note.id });
    } catch (error: any) {
      Alert.alert('エラー', error.message);
    }
  }, [actions, dispatch, navigation]);

  // キーボード + ChatInputBarの高さを計算してコンテンツが隠れないようにする
  const chatBarOffset = chatInputBarHeight + keyboardHeight;

  // 動的スタイル（テーマ依存、メモ化）
  const dynamicStyles = useMemo(() => StyleSheet.create({
    emptyMessage: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: spacing.xl,
    },
    listContent: { padding: spacing.md },
  }), [colors.textSecondary, spacing.xl, spacing.md]);

  // キーボードオフセット依存スタイル（メモ化）
  const contentPaddingStyle = useMemo(() => ({
    paddingBottom: chatBarOffset,
  }), [chatBarOffset]);

  const searchInput = (
    <NoteListSearchBar
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      placeholderTextColor={colors.textSecondary}
      isSearchActive={isSearchActive}
    />
  );

  useNoteListHeader({
    isSelectionMode: state.isSelectionMode,
    selectedNoteIds: state.selectedNoteIds,
    selectedFolderIds: state.selectedFolderIds,
    handleCancelSelection,
    handleDeleteSelected,
    handleCopySelected,
    handleOpenRenameModal,
    startMoveMode,
    isMoveMode: state.isMoveMode,
    cancelMoveMode,
    title: isSearchActive ? searchInput : undefined,
    rightButtons: isSearchActive
      ? []
      : [
          {
            icon: <Ionicons name="search" size={24} color={colors.text} />,
            onPress: handleStartSearch,
          },
          {
            icon: <OverflowMenu onCreateNew={() => dispatch({ type: 'OPEN_CREATE_MODAL' })} />,
            onPress: () => {}, // Not used
          },
        ],
    leftButtons: isSearchActive
      ? [{ icon: <Ionicons name="arrow-back" size={24} color={colors.text} />, onPress: handleCancelSearch }]
      : undefined,
  });

  useNoteListChatContext({
    items: items,
    currentPath: currentPath,
  });

  const renderTreeItem = useCallback(({ item: node }: { item: any }) => {
    const isSelected = node.type === 'folder'
      ? state.selectedFolderIds.has(node.id)
      : state.selectedNoteIds.has(node.id);

    const fileSystemItem = { type: node.type, item: node.item } as any;

    return (
      <TreeListItem
        node={node}
        isSelected={isSelected}
        isSelectionMode={state.isSelectionMode}
        onPress={() => handleSelectItem(fileSystemItem)}
        onLongPress={() => handleLongPressItem(fileSystemItem)}
        isMoveMode={state.isMoveMode}
        onSelectDestinationFolder={(folder: Folder) => {
          const targetPath = `${folder.path}/${folder.name}`;
          actions.moveSelectedItems(
            Array.from(state.selectedNoteIds),
            Array.from(state.selectedFolderIds),
            targetPath
          ).then(() => {
            dispatch({ type: 'EXIT_MOVE_MODE' });
            Alert.alert('成功', 'アイテムを移動しました');
          }).catch(error => {
            Alert.alert('エラー', error.message);
          });
        }}
      />
    );
  }, [
    state.selectedFolderIds,
    state.selectedNoteIds,
    state.isSelectionMode,
    state.isMoveMode,
    handleSelectItem,
    handleLongPressItem,
    actions,
    dispatch,
  ]);

  return (
    <MainContainer
      backgroundColor={colors.secondary}
      isLoading={state.loading && filteredNodes.length === 0}
    >
      {filteredNodes.length === 0 && !state.loading ? (
        <NoteListEmptyState
          containerStyle={staticStyles.centered}
          messageStyle={dynamicStyles.emptyMessage}
          message={searchQuery ? `No results for "${searchQuery}"` : 'This folder is empty. Tap the + icon to create a new note or folder.'}
        />
      ) : (
        <FlatList
          data={filteredNodes}
          renderItem={renderTreeItem}
          keyExtractor={(node) => `${node.type}-${node.id}`}
          contentContainerStyle={[
            contentPaddingStyle,
            dynamicStyles.listContent,
          ]}
          keyboardShouldPersistTaps="handled"
        />
      )}

      <CreateItemModal
        visible={state.modals.create.visible}
        currentPath={currentPath}
        onClose={() => dispatch({ type: 'CLOSE_CREATE_MODAL' })}
        onCreate={handleCreate}
      />
      {state.modals.rename.item && (
        <RenameItemModal
          visible={state.modals.rename.visible}
          initialName={state.modals.rename.item.type === 'folder' ? state.modals.rename.item.item.name : state.modals.rename.item.item.title}
          itemType={state.modals.rename.item.type}
          onClose={() => dispatch({ type: 'CLOSE_RENAME_MODAL' })}
          onRename={handleRename}
        />
      )}
    </MainContainer>
  );
}

/**
 * NoteListScreen (Providerでラップ)
 */
function NoteListScreen() {
  return (
    <NoteListProvider>
      <NoteListScreenContent />
    </NoteListProvider>
  );
}

export default NoteListScreen;
