// app/screen/note-list/hooks/useNoteTree.ts (最適化版)
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { NoteListStorage } from '../noteStorage';
import { buildTree } from '../utils/treeUtils';
import { PathService } from '../../../services/PathService';
import { FileSystemItem, Note, Folder } from '@shared/types/note';
import { checkTreeConsistency } from '../../../utils/debugUtils';
import { logger } from '../../../utils/logger';
import { useSettingsStore } from '../../../settings/settingsStore';

export const useNoteTree = (currentPath: string) => {
  const [folders, setFolders] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  // ツリーをメモ化 - folders、notes、expandedFolderIdsが変更された時のみ再計算
  const treeNodes = useMemo(() => {
    if (__DEV__) {
      logger.debug('tree', '🌲 Rebuilding tree (memoized)');
    }
    return buildTree(folders, notes, expandedFolderIds);
  }, [folders, notes, expandedFolderIds]);

  const { settings } = useSettingsStore();
  const maxDepth = settings.llmContextMaxDepth;

  // 後方互換性のためitemsを維持（徐々に削除予定）
  const items = useMemo(() => {
    if (maxDepth === 1) {
        const folderItems: FileSystemItem[] = folders
            .filter(f => f.path === currentPath)
            .map(f => ({ type: 'folder' as const, item: f }));
        const noteItems: FileSystemItem[] = notes
            .filter(n => n.path === currentPath)
            .map(n => ({ type: 'note' as const, item: n }));
        return [...folderItems, ...noteItems];
    }

    const normalizedRootPath = PathService.normalizePath(currentPath);
    const rootDepth = normalizedRootPath === '/' ? 0 : normalizedRootPath.split('/').length - 1;

    const filterByDepth = (item: Note | Folder) => {
        const itemPath = PathService.normalizePath(item.path);
        if (!itemPath.startsWith(normalizedRootPath)) return false;
        if (maxDepth === -1) return true; // -1 means infinite depth

        const itemDepth = itemPath === '/' ? 0 : itemPath.split('/').length - 1;
        return (itemDepth - rootDepth) < maxDepth;
    };

    const filteredFolders = folders.filter(filterByDepth);
    const filteredNotes = notes.filter(filterByDepth);

    const folderItems: FileSystemItem[] = filteredFolders.map(f => ({ type: 'folder' as const, item: f }));
    const noteItems: FileSystemItem[] = filteredNotes.map(n => ({ type: 'note' as const, item: n }));

    return [...folderItems, ...noteItems];
  }, [folders, notes, currentPath, maxDepth]);

  const fetchItemsAndBuildTree = useCallback(async () => {
    setLoading(true);
    try {
      if (__DEV__) {
        logger.debug('tree', '📥 Fetching items...');
      }

      await NoteListStorage.migrateExistingNotes();
      const fetchedFolders = await NoteListStorage.getAllFolders();
      const fetchedNotes = await NoteListStorage.getAllNotes();

      if (__DEV__) {
        logger.debug('tree', '📥 Fetched from storage:', {
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
          logger.debug('tree', '🔍 Running consistency check...');
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
