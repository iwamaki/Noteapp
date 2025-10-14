// app/screen/note-list/hooks/useModalManager.ts
import { useCallback, useState } from 'react';
import { FileSystemItem, Folder, Note } from '@shared/types/note';
import { flattenTree, TreeNode } from '../utils/treeUtils';

interface ModalState {
  create: {
    isVisible: boolean;
    open: () => void;
    close: () => void;
  };
  rename: {
    isVisible: boolean;
    item: FileSystemItem | null;
    open: (id: string, type: 'note' | 'folder', treeNodes: TreeNode[]) => void;
    close: () => void;
  };
}

export const useModalManager = (): ModalState => {
  // Create Modal
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  
  const openCreateModal = useCallback(() => {
    setIsCreateModalVisible(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setIsCreateModalVisible(false);
  }, []);

  // Rename Modal
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [itemToRename, setItemToRename] = useState<FileSystemItem | null>(null);

  const openRenameModal = useCallback((
    id: string,
    type: 'note' | 'folder',
    treeNodes: TreeNode[]
  ) => {
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
  }, []);

  const closeRenameModal = useCallback(() => {
    setIsRenameModalVisible(false);
    setItemToRename(null);
  }, []);

  return {
    create: {
      isVisible: isCreateModalVisible,
      open: openCreateModal,
      close: closeCreateModal,
    },
    rename: {
      isVisible: isRenameModalVisible,
      item: itemToRename,
      open: openRenameModal,
      close: closeRenameModal,
    },
  };
};