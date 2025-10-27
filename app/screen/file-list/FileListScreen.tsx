import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { StyleSheet, FlatList, Alert } from 'react-native';
import { useTheme } from '../../design/theme/ThemeContext';
import { useFileListHeader } from './hooks/useFileListHeader';
import { useFileListChatContext } from '../../features/chat/hooks/useFileListChatContext';
import { FileListEmptyState } from './components/FileListEmptyState';
import { OverflowMenu } from './components/OverflowMenu';
import { CreateItemModal } from './components/CreateItemModal';
import { TreeListItem } from './components/TreeListItem';
import { RenameItemModal } from './components/RenameItemModal';
import { MainContainer } from '../../components/MainContainer';
import { CustomModal } from '../../components/CustomModal';
import { useKeyboardHeight } from '../../contexts/KeyboardHeightContext';
import { FileListProvider, useFileListContext } from './context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { FileSystemItem, Folder } from '@data/core/types';
import { logger } from '../../utils/logger';
import { useSettingsStore } from '../../settings/settingsStore';

import { Ionicons } from '@expo/vector-icons';
import { useSearch } from './hooks/useSearch';
import { FileListSearchBar } from './components/FileListSearchBar';

// 静的スタイル（コンポーネント外部で定義）
const staticStyles = StyleSheet.create({
  centered: { justifyContent: 'center', alignItems: 'center' },
});

function FileListScreenContent() {
  const { colors, spacing } = useTheme();
  const { keyboardHeight, chatInputBarHeight } = useKeyboardHeight();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { settings } = useSettingsStore();

  // 新しいContext APIを使用
  const { state, dispatch, actions, items } = useFileListContext();

  // 削除確認モーダルの状態
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  // データ初期読み込み（初回のみ）
  useEffect(() => {
    logger.info('file', 'FileListScreen: Initial data refresh triggered.');
    actions.refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    logger.debug('file', `handleSelectItem called for item: ${item.item.id}, type: ${item.type}`);

    // 移動モード中
    if (state.isMoveMode) {
      logger.info('file', `Move mode active. Attempting to move item to folder: ${item.item.id}`);
      if (item.type === 'folder') {
        const folder = item.item as Folder;
        // V2型ではslugを使ってパスを構築
        // TODO: DirectoryResolverを使って正確なパスを取得する
        const targetPath = `/${folder.slug}`;
        actions.moveSelectedItems(
          Array.from(state.selectedFileIds),
          Array.from(state.selectedFolderIds),
          targetPath
        ).then(() => {
          logger.info('file', `Successfully moved selected items to ${targetPath}`);
          dispatch({ type: 'EXIT_MOVE_MODE' });
        }).catch(error => {
          logger.error('file', `Failed to move selected items to ${targetPath}: ${error.message}`, error);
        });
      }
      return;
    }

    // 選択モード中
    if (state.isSelectionMode) {
      logger.debug('file', `Selection mode active. Toggling item: ${item.item.id}`);
      if (item.type === 'folder') {
        dispatch({ type: 'TOGGLE_SELECT_FOLDER', payload: item.item.id });
      } else {
        dispatch({ type: 'TOGGLE_SELECT_FILE', payload: item.item.id });
      }
    } else {
      // 通常モード
      logger.debug('file', `Normal mode. Handling item: ${item.item.id}`);
      if (item.type === 'folder') {
        const folder = item.item as Folder;
        const isCurrentlyExpanded = state.expandedFolderIds.has(folder.id);

        // フォルダを展開する場合、子アイテムを読み込む
        if (!isCurrentlyExpanded) {
          const folderPath = state.folderPaths.get(folder.id);
          if (folderPath) {
            logger.debug('file', `Expanding folder ${folder.id} at path ${folderPath}. Loading children...`);
            actions.loadFolderChildren(folder.id, folderPath).catch(error => {
              logger.error('file', `Failed to load children for folder ${folder.id}: ${error.message}`, error);
            });
          }
        }

        dispatch({ type: 'TOGGLE_FOLDER', payload: folder.id });
      } else {
        logger.info('file', `Navigating to FileEdit for file: ${item.item.id} with initialViewMode: ${settings.defaultFileViewScreen}`);
        navigation.navigate('FileEdit', {
          fileId: item.item.id,
          initialViewMode: settings.defaultFileViewScreen
        });
      }
    }
  }, [
    state.isMoveMode,
    state.isSelectionMode,
    state.selectedFileIds,
    state.selectedFolderIds,
    state.expandedFolderIds,
    state.folderPaths,
    settings.defaultFileViewScreen,
    actions,
    dispatch,
    navigation,
  ]);

  /**
   * 長押しハンドラ（選択モード開始）
   */
  const handleLongPressItem = useCallback((item: FileSystemItem) => {
    logger.info('file', `Long press on item: ${item.item.id}. Entering selection mode.`);
    dispatch({ type: 'ENTER_SELECTION_MODE' });
    if (item.type === 'folder') {
      dispatch({ type: 'TOGGLE_SELECT_FOLDER', payload: item.item.id });
    } else {
      dispatch({ type: 'TOGGLE_SELECT_FILE', payload: item.item.id });
    }
  }, [dispatch]);

  /**
   * 選択解除ハンドラ
   */
  const handleCancelSelection = useCallback(() => {
    logger.info('file', 'Cancelling selection mode.');
    dispatch({ type: 'EXIT_SELECTION_MODE' });
  }, [dispatch]);

  /**
   * 削除確認モーダルを開く
   */
  const handleDeleteSelected = useCallback(async () => {
    logger.info('file', 'Opening delete confirmation modal');
    setShowDeleteConfirmModal(true);
  }, []);

  /**
   * 削除実行
   */
  const handleConfirmDelete = useCallback(async () => {
    logger.info('file', `Attempting to delete selected items. Files: ${Array.from(state.selectedFileIds).join(', ')}, Folders: ${Array.from(state.selectedFolderIds).join(', ')}`);
    setShowDeleteConfirmModal(false);
    try {
      await actions.deleteSelectedItems(
        Array.from(state.selectedFileIds),
        Array.from(state.selectedFolderIds)
      );
      logger.info('file', 'Successfully deleted selected items.');
    } catch (error: any) {
      logger.error('file', `Failed to delete selected items: ${error.message}`, error);
    }
  }, [actions, state.selectedFileIds, state.selectedFolderIds]);

  /**
   * コピーハンドラ
   */
  const handleCopySelected = useCallback(async () => {
    logger.info('file', `Attempting to copy selected files: ${Array.from(state.selectedFileIds).join(', ')}`);
    try {
      await actions.copySelectedFiles(Array.from(state.selectedFileIds));
      logger.info('file', 'Successfully copied selected files.');
    } catch (error: any) {
      logger.error('file', `Failed to copy selected files: ${error.message}`, error);
    }
  }, [actions, state.selectedFileIds]);

  /**
   * 移動モード開始
   */
  const startMoveMode = useCallback(() => {
    if (state.selectedFileIds.size > 0 || state.selectedFolderIds.size > 0) {
      logger.info('file', 'Entering move mode.');
      dispatch({ type: 'ENTER_MOVE_MODE' });
    } else {
      logger.debug('file', 'Cannot enter move mode: no items selected.');
    }
  }, [state.selectedFileIds, state.selectedFolderIds, dispatch]);

  /**
   * 移動モードキャンセル
   */
  const cancelMoveMode = useCallback(() => {
    logger.info('file', 'Cancelling move mode.');
    dispatch({ type: 'EXIT_MOVE_MODE' });
  }, [dispatch]);

  /**
   * リネームモーダルを開く
   */
  const handleOpenRenameModal = useCallback((id: string, type: 'file' | 'folder') => {
    logger.info('file', `Opening rename modal for ${type} with ID: ${id}`);
    const item: FileSystemItem | null = type === 'folder'
      ? { type: 'folder', item: state.folders.find(f => f.id === id)! }
      : { type: 'file', item: state.files.find(f => f.id === id)! };

    if (item && item.item) {
      dispatch({ type: 'OPEN_RENAME_MODAL', payload: item });
    } else {
      logger.warn('file', `Item not found for rename modal: ID ${id}, type ${type}`);
    }
  }, [state.folders, state.files, dispatch]);

  /**
   * リネーム実行
   */
  const handleRename = useCallback(async (newName: string) => {
    if (state.modals.rename.item) {
      const item = state.modals.rename.item;
      logger.info('file', `Attempting to rename ${item.type} from ${item.type === 'folder' ? item.item.name : item.item.title} to ${newName}`);
      try {
        if (item.type === 'folder') {
          await actions.renameFolder(item.item.id, newName);
        } else {
          await actions.renameFile(item.item.id, newName);
        }
        logger.info('file', `Successfully renamed ${item.type} to ${newName}`);
        dispatch({ type: 'CLOSE_RENAME_MODAL' });
        Alert.alert('成功', '名前を変更しました');
      } catch (error: any) {
        logger.error('file', `Failed to rename ${item.type} to ${newName}: ${error.message}`, error);
        Alert.alert('エラー', error.message);
      }
    }
  }, [state.modals.rename.item, actions, dispatch]);

  /**
   * 作成実行
   */
  const handleCreate = useCallback(async (inputPath: string) => {
    logger.info('file', `Attempting to create new file at path: ${inputPath}`);
    try {
      const file = await actions.createFileWithPath(inputPath);
      logger.info('file', `Successfully created file: ${file.id} at ${inputPath}`);
      dispatch({ type: 'CLOSE_CREATE_MODAL' });
      navigation.navigate('FileEdit', {
        fileId: file.id,
        initialViewMode: settings.defaultFileViewScreen
      });
    } catch (error: any) {
      logger.error('file', `Failed to create file at ${inputPath}: ${error.message}`, error);
      Alert.alert('エラー', error.message);
    }
  }, [actions, dispatch, navigation, settings.defaultFileViewScreen]);

  // キーボード + ChatInputBarの高さを計算してコンテンツが隠れないようにする
  const chatBarOffset = chatInputBarHeight + keyboardHeight;

  // キーボードオフセット依存スタイル（メモ化）
  const contentContainerStyle = useMemo(() => ([
    {
      paddingBottom: chatBarOffset,
      padding: spacing.md,
    },
  ]), [chatBarOffset, spacing.md]);

  const searchInput = (
    <FileListSearchBar
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      placeholderTextColor={colors.textSecondary}
      isSearchActive={isSearchActive}
    />
  );

  useFileListHeader({
    isSelectionMode: state.isSelectionMode,
    selectedFileIds: state.selectedFileIds,
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

  useFileListChatContext({
    items: items,
    currentPath: currentPath,
  });

  const renderTreeItem = useCallback(({ item: node }: { item: any }) => {
    const isSelected = node.type === 'folder'
      ? state.selectedFolderIds.has(node.id)
      : state.selectedFileIds.has(node.id);

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
          // V2型ではslugを使ってパスを構築
          const targetPath = `/${folder.slug}`;
          logger.info('file', `TreeListItem: Attempting to move selected items to destination folder: ${targetPath}`);
          actions.moveSelectedItems(
            Array.from(state.selectedFileIds),
            Array.from(state.selectedFolderIds),
            targetPath
          ).then(() => {
            logger.info('file', `TreeListItem: Successfully moved selected items to ${targetPath}`);
            dispatch({ type: 'EXIT_MOVE_MODE' });
          }).catch(error => {
            logger.error('file', `TreeListItem: Failed to move selected items to ${targetPath}: ${error.message}`, error);
          });
        }}
      />
    );
  }, [
    state.selectedFolderIds,
    state.selectedFileIds,
    state.isSelectionMode,
    state.isMoveMode,
    handleSelectItem,
    handleLongPressItem,
    actions,
    dispatch,
  ]);

  // レンダリング時のデバッグログ
  logger.debug('file', `FileListScreen: Rendering. filteredNodes.length: ${filteredNodes.length}, searchQuery: '${searchQuery}', state.loading: ${state.loading}`);

  const messageTextStyle = useMemo(() => ({
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  }), [colors.textSecondary, spacing.xl]);

  return (
    <MainContainer
      backgroundColor={colors.secondary}
      isLoading={state.loading && filteredNodes.length === 0}
    >
      {filteredNodes.length === 0 && !state.loading ? (
        <FileListEmptyState
          containerStyle={staticStyles.centered}
          messageStyle={messageTextStyle}
          message={searchQuery ? `No results for "${searchQuery}"` : 'This folder is empty. Tap the + icon to create a new file or folder.'}
        />
      ) : (
        <FlatList
          data={filteredNodes}
          renderItem={renderTreeItem}
          keyExtractor={(node) => `${node.type}-${node.id}`}
          contentContainerStyle={contentContainerStyle}
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

      <CustomModal
        isVisible={showDeleteConfirmModal}
        title="削除確認"
        message={`選択したアイテム（ファイル: ${state.selectedFileIds.size}件、フォルダ: ${state.selectedFolderIds.size}件）を削除しますか？この操作は取り消せません。`}
        buttons={[
          {
            text: 'キャンセル',
            style: 'cancel',
            onPress: () => setShowDeleteConfirmModal(false),
          },
          {
            text: '削除',
            style: 'destructive',
            onPress: handleConfirmDelete,
          },
        ]}
        onClose={() => setShowDeleteConfirmModal(false)}
      />
    </MainContainer>
  );
}

/**
 * FileListScreen (Providerでラップ)
 */
function FileListScreen() {
  return (
    <FileListProvider>
      <FileListScreenContent />
    </FileListProvider>
  );
}

export default FileListScreen;
