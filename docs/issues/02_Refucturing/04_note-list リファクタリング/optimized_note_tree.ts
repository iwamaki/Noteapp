// app/screen/note-list/hooks/useNoteTree.ts (最適化版)
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { NoteListStorage } from '../noteStorage';
import { buildTree, TreeNode } from '../utils/treeUtils';
import { FileSystemItem } from '@shared/types/note';
import { checkTreeConsistency } from '../../../utils/debugUtils';

export const useNoteTree = (currentPath: string) => {
  const [folders, setFolders] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  // ツリーをメモ化 - folders、notes、expandedFolderIdsが変更された時のみ再計算
  const treeNodes = useMemo(() => {
    if (__DEV__) {
      console.log('🌲 Rebuilding tree (memoized)');
    }
    return buildTree(folders, notes, expandedFolderIds);
  }, [folders, notes, expandedFolderIds]);

  // 後方互換性のためitemsを維持（徐々に削除予定）
  const items = useMemo(() => {
    const folderItems: FileSystemItem[] = folders
      .filter(f => f.path === currentPath)
      .map(f => ({ type: 'folder' as const, item: f }));
    
    const noteItems: FileSystemItem[] = notes
      .filter(n => n.path === currentPath)
      .map(n => ({ type: 'note' as const, item: n }));
    
    return [...folderItems, ...noteItems];
  }, [folders, notes, currentPath]);

  const fetchItemsAndBuildTree = useCallback(async () => {
    setLoading(true);
    try {
      if (__DEV__) {
        console.log('📥 Fetching items...');
      }

      await NoteListStorage.migrateExistingNotes();
      const fetchedFolders = await NoteListStorage.getAllFolders();
      const fetchedNotes = await NoteListStorage.getAllNotes();

      if (__DEV__) {
        console.log('📥 Fetched from storage:', {
          folders: fetchedFolders.length,
          notes: fetchedNotes.length,
        });
      }

      // 状態を更新（これによりtreeNodesが自動的に再計算される）
      setFolders(fetchedFolders);
      setNotes(fetchedNotes);

      if (__DEV__) {
        // 次のレンダリング後に整合性チェック
        setTimeout(async () => {
          console.log('🔍 Running consistency check...');
          const tree = buildTree(fetchedFolders, fetchedNotes, expandedFolderIds);
          await checkTreeConsistency(tree);
        }, 0);
      }
    } catch (error) {
      console.error("❌ Failed to fetch items:", error);
    } finally {
      setLoading(false);
    }
  }, [expandedFolderIds]);

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
    items,
    loading,
    expandedFolderIds,
    toggleFolderExpand,
    refreshTree,
  };
};