import React, { useCallback } from 'react';
import { StyleSheet, FlatList } from 'react-native';
import { useTheme } from '../../design/theme/ThemeContext';
import { useNoteList } from './hooks/useNoteList';
import { useNoteListHeader } from './hooks/useNoteListHeader';
import { useNoteListChatContext } from '../../features/chat/hooks/useNoteListChatContext';
import { NoteListEmptyState } from './components/NoteListEmptyState';
import { FabButton } from '../../components/FabButton';
import { CreateItemModal } from './components/CreateItemModal';
import { TreeListItem } from './components/TreeListItem';
import { RenameItemModal } from './components/RenameItemModal';
import { MainContainer } from '../../components/MainContainer';
import { flattenTree } from './utils/treeUtils';
import { useChatLayoutMetrics } from '../../features/chat/layouts/useChatLayoutMetrics';

function NoteListScreen() {
  const { colors, spacing } = useTheme();
  const { contentBottomPadding } = useChatLayoutMetrics(spacing.xl);

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

  const flattenedTree = flattenTree(treeNodes);

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
  });

  // TODO: useNoteListChatContext needs to be updated to work with the new structure
  // For now, we pass an empty array to avoid breaking the app.
  useNoteListChatContext({
    items: [],
    currentPath: currentPath,
  });

  const styles = StyleSheet.create({
    centered: { justifyContent: 'center', alignItems: 'center' },
    emptyMessage: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: spacing.xl,
    },
    listContent: { padding: spacing.md },
  });

  const renderTreeItem = useCallback(({ item: node }: { item: (typeof flattenedTree)[0] }) => {
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
      isLoading={loading && flattenedTree.length === 0}
    >
      {flattenedTree.length === 0 && !loading ? (
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
            { paddingBottom: contentBottomPadding },
            styles.listContent,
          ]}
        />
      )}
      {!selection.isSelectionMode && !actions.moveMode.isActive && (
        <FabButton onPress={createModal.open} />
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
