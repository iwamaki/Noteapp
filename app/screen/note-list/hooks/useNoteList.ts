
import { useCallback } from 'react';
import { useFolderNavigation } from './useFolderNavigation';
import { useNoteTree } from './useNoteTree';
import { useItemSelection } from './useItemSelection';
import { useItemActions } from './useItemActions';
import { useModals } from './useModals';
import { FileSystemItem, Folder } from '@shared/types/note';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/types';

export const useNoteList = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const folderNavigation = useFolderNavigation();
  const {
    treeNodes,
    loading,
    toggleFolderExpand,
    refreshTree,
  } = useNoteTree(folderNavigation.currentPath);

  const selection = useItemSelection();

  const modals = useModals(() => treeNodes);

  // Memoize the callback without depending on actions
  const handleActionSuccess = useCallback(() => {
    refreshTree();
    selection.clearSelection();
  }, [refreshTree, selection]);

  const actions = useItemActions({
    selectedNoteIds: selection.selectedNoteIds,
    selectedFolderIds: selection.selectedFolderIds,
    currentPath: folderNavigation.currentPath,
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
    if (modals.renameModal.item) {
      await actions.handleRenameItem(modals.renameModal.item, newName);
    }
    modals.renameModal.close();
  }, [actions, modals.renameModal]);
  
  // Create modal needs to call the action
  const handleCreate = useCallback(async (inputPath: string) => {
    await actions.handleCreateItem(inputPath);
    modals.createModal.close();
  }, [actions, modals.createModal]);


  return {
    // Data and loading state
    treeNodes,
    loading,
    
    // Folder navigation
    folderNavigation,

    // Item selection
    selection,
    handleSelectItem,
    handleLongPressItem: selection.handleLongPressItem,

    // Actions
    actions,

    // Modals
    createModal: {
      ...modals.createModal,
      onCreate: handleCreate,
    },
    renameModal: {
      ...modals.renameModal,
      onRename: handleRename,
    },
  };
};
