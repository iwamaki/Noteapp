
import { useCallback, useState } from 'react';
import { useNoteTree } from './useNoteTree';
import { useItemSelection } from './useItemSelection';
import { useItemActions } from './useItemActions';
import { useModalManager } from './useModalManager';
import { FileSystemItem, Folder } from '@shared/types/note';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/types';

export const useNoteList = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  // --- Folder Navigation (integrated from useFolderNavigation) ---
  // Currently, tree view is primary so we only need currentPath state
  // Future: Can add breadcrumbs and navigation methods if needed
  const [currentPath] = useState<string>('/');
  const {
    treeNodes,
    loading,
    items, // Pass items through
    toggleFolderExpand,
    refreshTree,
  } = useNoteTree(currentPath);

  const selection = useItemSelection();

  // --- Modal State Management (using useModalManager) ---
  const modals = useModalManager();

  // Memoize the callback without depending on actions
  const handleActionSuccess = useCallback(() => {
    refreshTree();
    selection.clearSelection();
  }, [refreshTree, selection]);

  const actions = useItemActions({
    selectedNoteIds: selection.selectedNoteIds,
    selectedFolderIds: selection.selectedFolderIds,
    currentPath: currentPath,
    onSuccess: handleActionSuccess,
  });

  const handleSelectItem = useCallback((item: FileSystemItem) => {
    if (actions.moveMode.isActive) {
      if (item.type === 'folder') {
        actions.moveMode.handleMove(item.item as Folder);
      }
      return;
    }

    if (selection.isSelectionMode) {
      selection.toggleItemSelection(item);
    } else {
      if (item.type === 'folder') {
        toggleFolderExpand(item.item.id);
      } else {
        navigation.navigate('NoteEdit', { noteId: item.item.id });
      }
    }
  }, [
    actions.moveMode,
    selection.isSelectionMode,
    selection.toggleItemSelection,
    toggleFolderExpand,
    navigation,
  ]);

  // Rename modal needs to call the action
  const handleRename = useCallback(async (newName: string) => {
    if (modals.rename.item) {
      await actions.handleRenameItem(modals.rename.item, newName);
    }
    modals.rename.close();
  }, [actions, modals.rename]);

  // Create modal needs to call the action
  const handleCreate = useCallback(async (inputPath: string) => {
    await actions.handleCreateItem(inputPath);
    modals.create.close();
  }, [actions, modals.create]);


  return {
    // Data and loading state
    treeNodes,
    loading,
    items,

    // Folder navigation (simplified - only exposing currentPath)
    currentPath,

    // Item selection
    selection,
    handleSelectItem,
    handleLongPressItem: selection.handleLongPressItem,

    // Actions
    actions,

    // Modals
    createModal: {
      isVisible: modals.create.isVisible,
      open: modals.create.open,
      close: modals.create.close,
      onCreate: handleCreate,
    },
    renameModal: {
      isVisible: modals.rename.isVisible,
      item: modals.rename.item,
      open: (id: string, type: 'note' | 'folder') => modals.rename.open(id, type, treeNodes),
      close: modals.rename.close,
      onRename: handleRename,
    },
  };
};
