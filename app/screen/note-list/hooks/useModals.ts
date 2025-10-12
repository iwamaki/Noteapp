
import { useState, useCallback } from 'react';
import { FileSystemItem, Folder, Note } from '@shared/types/note';
import { TreeNode } from '../utils/treeUtils';
import { flattenTree } from '../utils/treeUtils';

export const useModals = (getTreeNodes: () => TreeNode[]) => {
  // Create Modal
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

  // Rename Modal
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [itemToRename, setItemToRename] = useState<FileSystemItem | null>(null);

  const openCreateModal = useCallback(() => {
    setIsCreateModalVisible(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setIsCreateModalVisible(false);
  }, []);

  const openRenameModal = useCallback((id: string, type: 'note' | 'folder') => {
    const flattened = flattenTree(getTreeNodes());
    const node = flattened.find(node => node.type === type && node.item.id === id);
    if (node) {
      if (node.type === 'folder') {
        setItemToRename({ type: 'folder', item: node.item as Folder });
      } else {
        setItemToRename({ type: 'note', item: node.item as Note });
      }
      setIsRenameModalVisible(true);
    }
  }, [getTreeNodes]);

  const closeRenameModal = useCallback(() => {
    setIsRenameModalVisible(false);
    setItemToRename(null);
  }, []);

  return {
    createModal: {
      isVisible: isCreateModalVisible,
      open: openCreateModal,
      close: closeCreateModal,
    },
    renameModal: {
      isVisible: isRenameModalVisible,
      item: itemToRename,
      open: openRenameModal,
      close: closeRenameModal,
    },
  };
};
