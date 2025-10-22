// app/screen/file-list/hooks/useSearch.ts (拡張版)
import { useState, useMemo, useCallback } from 'react';
import { flattenTree, TreeNode } from '../utils/treeUtils';
import { File, Folder } from '../../../../shared/types/file';

export type SearchTarget = 'all' | 'files' | 'folders';
export type SearchField = 'title' | 'content' | 'all';

export interface SearchOptions {
  target: SearchTarget;
  field: SearchField;
  caseSensitive: boolean;
}

const DEFAULT_OPTIONS: SearchOptions = {
  target: 'all',
  field: 'all',
  caseSensitive: false,
};

export const useSearch = (treeNodes: TreeNode[]) => {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOptions, setSearchOptions] = useState<SearchOptions>(DEFAULT_OPTIONS);

  const flattenedTree = useMemo(() => flattenTree(treeNodes), [treeNodes]);

  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) {
      return flattenedTree;
    }

    const query = searchOptions.caseSensitive
      ? searchQuery.trim()
      : searchQuery.trim().toLowerCase();

    return flattenedTree.filter(node => {
      // ターゲットフィルタ
      if (searchOptions.target === 'files' && node.type !== 'file') return false;
      if (searchOptions.target === 'folders' && node.type !== 'folder') return false;

      if (node.type === 'file') {
        const file = node.item as File;
        const title = searchOptions.caseSensitive ? file.title : file.title.toLowerCase();
        const content = searchOptions.caseSensitive ? file.content : file.content.toLowerCase();

        switch (searchOptions.field) {
          case 'title':
            return title.includes(query);
          case 'content':
            return content.includes(query);
          case 'all':
            return title.includes(query) || content.includes(query);
          default:
            return false;
        }
      } else {
        // フォルダの場合
        const folder = node.item as Folder;
        const name = searchOptions.caseSensitive ? folder.name : folder.name.toLowerCase();
        return name.includes(query);
      }
    });
  }, [flattenedTree, searchQuery, searchOptions]);

  const handleCancelSearch = useCallback(() => {
    setIsSearchActive(false);
    setSearchQuery('');
    setSearchOptions(DEFAULT_OPTIONS);
  }, []);

  const handleStartSearch = useCallback(() => {
    setIsSearchActive(true);
  }, []);

  const updateSearchOptions = useCallback((options: Partial<SearchOptions>) => {
    setSearchOptions(prev => ({ ...prev, ...options }));
  }, []);

  return {
    isSearchActive,
    searchQuery,
    searchOptions,
    setSearchQuery,
    updateSearchOptions,
    filteredNodes,
    resultCount: filteredNodes.length,
    handleCancelSearch,
    handleStartSearch,
  };
};
