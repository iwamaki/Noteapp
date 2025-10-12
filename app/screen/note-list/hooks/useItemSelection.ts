
import { useState, useCallback } from 'react';
import { FileSystemItem } from '@shared/types/note';

export const useItemSelection = () => {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());

  const handleLongPressItem = useCallback((item: FileSystemItem) => {
    setIsSelectionMode(true);
    if (item.type === 'folder') {
      setSelectedFolderIds(new Set([item.item.id]));
      setSelectedNoteIds(new Set());
    } else {
      setSelectedNoteIds(new Set([item.item.id]));
      setSelectedFolderIds(new Set());
    }
  }, []);

  const toggleItemSelection = useCallback((item: FileSystemItem) => {
    if (item.type === 'folder') {
      setSelectedFolderIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(item.item.id)) {
          newSet.delete(item.item.id);
        } else {
          newSet.add(item.item.id);
        }
        return newSet;
      });
    } else {
      setSelectedNoteIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(item.item.id)) {
          newSet.delete(item.item.id);
        } else {
          newSet.add(item.item.id);
        }
        return newSet;
      });
    }
  }, []);

  const handleCancelSelection = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedNoteIds(new Set());
    setSelectedFolderIds(new Set());
  }, []);
  
  const hasSelection = selectedNoteIds.size > 0 || selectedFolderIds.size > 0;

  return {
    isSelectionMode,
    setIsSelectionMode,
    selectedNoteIds,
    selectedFolderIds,
    handleLongPressItem,
    toggleItemSelection,
    handleCancelSelection,
    hasSelection,
    clearSelection: handleCancelSelection, // alias
  };
};
