import React, { useCallback, useMemo } from 'react';
import { StyleSheet, FlatList } from 'react-native';
import { useTheme } from '../../design/theme/ThemeContext';
import { useNoteList } from './hooks/useNoteList';
import { useNoteListHeader } from './hooks/useNoteListHeader';
import { useNoteListChatContext } from '../../features/chat/hooks/useNoteListChatContext';
import { NoteListEmptyState } from './components/NoteListEmptyState';
import { OverflowMenu } from './components/OverflowMenu';
import { CreateItemModal } from './components/CreateItemModal';
import { TreeListItem } from './components/TreeListItem';
import { RenameItemModal } from './components/RenameItemModal';
import { MainContainer } from '../../components/MainContainer';
import { useKeyboardHeight } from '../../contexts/KeyboardHeightContext';

import { Ionicons } from '@expo/vector-icons';
import { useSearch } from './hooks/useSearch';
import { NoteListSearchBar } from './components/NoteListSearchBar';

// 静的スタイル（コンポーネント外部で定義）
const staticStyles = StyleSheet.create({
  centered: { justifyContent: 'center', alignItems: 'center' },
});

function NoteListScreen() {
  const { colors, spacing } = useTheme();
  const { keyboardHeight, chatInputBarHeight } = useKeyboardHeight();

  const {
    treeNodes,
    loading,
    currentPath,
    selection,
    handleSelectItem,
    handleLongPressItem,
    actions,
    createModal,
    renameModal,
  } = useNoteList();

  const {
    isSearchActive,
    searchQuery,
    setSearchQuery,
    filteredNodes,
    handleCancelSearch,
    handleStartSearch,
  } = useSearch(treeNodes);

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
    isSelectionMode: selection.isSelectionMode,
    selectedNoteIds: selection.selectedNoteIds,
    selectedFolderIds: selection.selectedFolderIds,
    handleCancelSelection: selection.handleCancelSelection,
    handleDeleteSelected: actions.handleDeleteSelected,
    handleCopySelected: actions.handleCopySelected,
    handleOpenRenameModal: renameModal.open,
    startMoveMode: actions.moveMode.start,
    isMoveMode: actions.moveMode.isActive,
    cancelMoveMode: actions.moveMode.cancel,
    title: isSearchActive ? searchInput : undefined,
    rightButtons: isSearchActive
      ? []
      : [
          {
            icon: <Ionicons name="search" size={24} color={colors.text} />,
            onPress: handleStartSearch,
          },
          {
            icon: <OverflowMenu onCreateNew={createModal.open} />,
            onPress: () => {}, // Not used
          },
        ],
    leftButtons: isSearchActive
      ? [{ icon: <Ionicons name="arrow-back" size={24} color={colors.text} />, onPress: handleCancelSearch }]
      : undefined,
  });

  useNoteListChatContext({
    items: isSearchActive ? filteredNodes : treeNodes,
    currentPath: currentPath,
  });

  const renderTreeItem = useCallback(({ item: node }: { item: any }) => {
    const isSelected = node.type === 'folder'
      ? selection.selectedFolderIds.has(node.id)
      : selection.selectedNoteIds.has(node.id);

    const fileSystemItem = { type: node.type, item: node.item } as any;

    return (
      <TreeListItem
        node={node}
        isSelected={isSelected}
        isSelectionMode={selection.isSelectionMode}
        onPress={() => handleSelectItem(fileSystemItem)}
        onLongPress={() => handleLongPressItem(fileSystemItem)}
        isMoveMode={actions.moveMode.isActive}
        onSelectDestinationFolder={actions.moveMode.handleMove}
      />
    );
  }, [
    selection.selectedFolderIds,
    selection.selectedNoteIds,
    selection.isSelectionMode,
    handleSelectItem,
    handleLongPressItem,
    actions.moveMode.isActive,
    actions.moveMode.handleMove,
  ]);

  return (
    <MainContainer
      backgroundColor={colors.secondary}
      isLoading={loading && filteredNodes.length === 0}
    >
      {filteredNodes.length === 0 && !loading ? (
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
        visible={createModal.isVisible}
        currentPath={currentPath}
        onClose={createModal.close}
        onCreate={createModal.onCreate}
      />
      {renameModal.item && (
        <RenameItemModal
          visible={renameModal.isVisible}
          initialName={renameModal.item.type === 'folder' ? renameModal.item.item.name : renameModal.item.item.title}
          itemType={renameModal.item.type}
          onClose={renameModal.close}
          onRename={renameModal.onRename}
        />
      )}
    </MainContainer>
  );
}

export default NoteListScreen;
