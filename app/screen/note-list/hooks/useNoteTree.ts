
import { useState, useCallback, useEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { NoteListStorage } from '../noteStorage';
import { buildTree, TreeNode } from '../utils/treeUtils';
import { FileSystemItem } from '@shared/types/note';
import { checkTreeConsistency } from '../../../utils/debugUtils';

export const useNoteTree = (currentPath: string) => {
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [items, setItems] = useState<FileSystemItem[]>([]); // Keep items for compatibility
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  const fetchItemsAndBuildTree = useCallback(async () => {
    setLoading(true);
    try {
      if (__DEV__) {
        console.log('📥 Fetching items and building tree...');
      }

      await NoteListStorage.migrateExistingNotes();
      const folders = await NoteListStorage.getAllFolders();
      const notes = await NoteListStorage.getAllNotes();

      if (__DEV__) {
        console.log('📥 Fetched from storage:', {
          folders: folders.length,
          notes: notes.length,
        });
      }

      const tree = buildTree(folders, notes, expandedFolderIds);
      setTreeNodes(tree);

      if (__DEV__) {
        console.log('🔍 Running consistency check...');
        await checkTreeConsistency(tree);
      }

      const fetchedItems = await NoteListStorage.getItemsByPath(currentPath);
      setItems(fetchedItems);
    } catch (error) {
      console.error("❌ Failed to fetch items and build tree:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPath, expandedFolderIds]);

  useEffect(() => {
    if (isFocused) {
      fetchItemsAndBuildTree();
    }
  }, [isFocused, fetchItemsAndBuildTree]);

  const toggleFolderExpand = useCallback((folderId: string) => {
    setExpandedFolderIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  }, []);
  
  const refreshTree = useCallback(() => {
    fetchItemsAndBuildTree();
  }, [fetchItemsAndBuildTree]);

  return {
    treeNodes,
    items, // continue to expose for now
    loading,
    expandedFolderIds,
    toggleFolderExpand,
    refreshTree,
  };
};
