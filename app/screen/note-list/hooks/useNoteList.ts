
import { useCallback, useState } from 'react';
import { useNoteTree } from './useNoteTree';
import { useItemSelection } from './useItemSelection';
import { useItemActions } from './useItemActions';
import { FileSystemItem, Folder, Note } from '@shared/types/note';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/types';
import { flattenTree } from '../utils/treeUtils';

export const useNoteList = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  // --- Folder Navigation (integrated from useFolderNavigation) ---
  // Currently, tree view is primary so we only need currentPath state
  // Future: Can add breadcrumbs and navigation methods if needed
  const [currentPath] = useState<string>('/');
  const {
    treeNodes,
    loading,
    toggleFolderExpand,
    refreshTree,
  } = useNoteTree(currentPath);

  const selection = useItemSelection();

  // --- Modal State Management (integrated from useModals) ---
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [itemToRename, setItemToRename] = useState<FileSystemItem | null>(null);

  const openCreateModal = useCallback(() => {
    setIsCreateModalVisible(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setIsCreateModalVisible(false);
  }, []);

  const openRenameModal = useCallback((id: string, type: 'note' | 'folder') => {
    const flattened = flattenTree(treeNodes);
    const node = flattened.find(node => node.type === type && node.item.id === id);
    if (node) {
      if (node.type === 'folder') {
        setItemToRename({ type: 'folder', item: node.item as Folder });
      } else {
        setItemToRename({ type: 'note', item: node.item as Note });
      }
      setIsRenameModalVisible(true);
    }
  }, [treeNodes]);

  const closeRenameModal = useCallback(() => {
    setIsRenameModalVisible(false);
    setItemToRename(null);
  }, []);

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
    if (itemToRename) {
      await actions.handleRenameItem(itemToRename, newName);
    }
    closeRenameModal();
  }, [actions, itemToRename, closeRenameModal]);

  // Create modal needs to call the action
  const handleCreate = useCallback(async (inputPath: string) => {
    await actions.handleCreateItem(inputPath);
    closeCreateModal();
  }, [actions, closeCreateModal]);


  return {
    // Data and loading state
    treeNodes,
    loading,

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
      isVisible: isCreateModalVisible,
      open: openCreateModal,
      close: closeCreateModal,
      onCreate: handleCreate,
    },
    renameModal: {
      isVisible: isRenameModalVisible,
      item: itemToRename,
      open: openRenameModal,
      close: closeRenameModal,
      onRename: handleRename,
    },
  };
};
