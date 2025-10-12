import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  FlatList,
} from 'react-native';
import { useTheme } from '../../design/theme/ThemeContext';
import { useNoteListLogic } from './hooks/useNoteListLogic';
import { useNoteListHeader } from './hooks/useNoteListHeader';
import { useNoteListChatContext } from '../../features/chat/hooks/useNoteListChatContext';
import { NoteListEmptyState } from './components/NoteListEmptyState';
import { FabButton } from '../../components/FabButton';
import { CreateItemModal } from './components/CreateItemModal';
import { TreeListItem } from './components/TreeListItem';
import { RenameItemModal } from './components/RenameItemModal';
import { MainContainer } from '../../components/MainContainer';
import { flattenTree } from './utils/treeUtils';
import { useKeyboard } from '../../contexts/KeyboardContext';
import { CHAT_INPUT_HEIGHT } from '../../design/constants';

// ノート一覧画面コンポーネント
function NoteListScreen() {
  const { colors, spacing } = useTheme();
  const { keyboardHeight } = useKeyboard();
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

  const {
    items,
    treeNodes,
    loading,
    isSelectionMode,
    selectedNoteIds,
    selectedFolderIds,
    handleSelectItem,
    handleLongPressItem,
    handleCancelSelection,
    handleDeleteSelected,
    handleCopySelected,
    handleCreateNoteWithPath,
    folderNavigation,
    isRenameModalVisible,
    itemToRename,
    handleRenameItem,
    setIsRenameModalVisible,
    isMoveMode, // New: from useNoteListLogic
    startMoveMode, // New: from useNoteListLogic
    cancelMoveMode, // New: from useNoteListLogic
    handleSelectDestinationFolder, // New: from useNoteListLogic
    handleOpenRenameModal,
  } = useNoteListLogic();

  // ツリーをフラット化してFlatListで表示
  const flattenedTree = flattenTree(treeNodes);

  useNoteListHeader({
    isSelectionMode,
    selectedNoteIds,
    selectedFolderIds,
    handleCancelSelection,
    handleDeleteSelected,
    handleCopySelected,
    handleOpenRenameModal,
    startMoveMode,
    isMoveMode,
    cancelMoveMode,
  });

  // チャットコンテキストプロバイダーを登録
  useNoteListChatContext({
    items,
    currentPath: folderNavigation.currentPath,
  });

  const styles = StyleSheet.create({
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyMessage: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: spacing.xl,
    },
    listContent: {
      padding: spacing.md,
    },
  });

  // ツリーアイテムのレンダラー
  const renderTreeItem = useCallback(({ item: node }: { item: (typeof flattenedTree)[0] }) => {
    const isSelected = node.type === 'folder'
      ? selectedFolderIds.has(node.id)
      : selectedNoteIds.has(node.id);

    const fileSystemItem = {
      type: node.type,
      item: node.item,
    } as any;

    return (
      <TreeListItem
        node={node}
        isSelected={isSelected}
        isSelectionMode={isSelectionMode}
        onPress={() => handleSelectItem(fileSystemItem)}
        onLongPress={() => handleLongPressItem(fileSystemItem)}
        isMoveMode={isMoveMode} // Pass isMoveMode
        onSelectDestinationFolder={handleSelectDestinationFolder} // Pass handler
      />
    );
  }, [selectedFolderIds, selectedNoteIds, isSelectionMode, handleSelectItem, handleLongPressItem, isMoveMode, handleSelectDestinationFolder]);

  // メインの表示
  return (
    <MainContainer
      backgroundColor={colors.secondary}
      isLoading={loading.isLoading && items.length === 0}
    >
      {flattenedTree.length === 0 && !loading.isLoading ? (
        <NoteListEmptyState
          containerStyle={styles.centered}
          messageStyle={styles.emptyMessage}
        />
      ) : (
        <FlatList
          data={flattenedTree}
          renderItem={renderTreeItem}
          keyExtractor={(node) => `${node.type}-${node.id}`}
          contentContainerStyle={[
            { paddingBottom: keyboardHeight + CHAT_INPUT_HEIGHT + spacing.xl },
            styles.listContent
          ]}
        />
      )}
      {!isSelectionMode && !isMoveMode && <FabButton onPress={() => setIsCreateModalVisible(true)} />}
      <CreateItemModal
        visible={isCreateModalVisible}
        currentPath={folderNavigation.currentPath}
        onClose={() => setIsCreateModalVisible(false)}
        onCreate={handleCreateNoteWithPath}
      />
      {itemToRename && (
        <RenameItemModal
          visible={isRenameModalVisible}
          initialName={itemToRename.type === 'folder' ? itemToRename.item.name : itemToRename.item.title}
          itemType={itemToRename.type}
          onClose={() => setIsRenameModalVisible(false)}
          onRename={handleRenameItem}
        />
      )}
    </MainContainer>
  );
}

export default NoteListScreen;
