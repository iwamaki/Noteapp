import { useState, useMemo } from 'react';
import { flattenTree, TreeNode } from '../utils/treeUtils';
import { Note } from '../../../../shared/types/note';

export const useSearch = (treeNodes: TreeNode[]) => {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const flattenedTree = useMemo(() => flattenTree(treeNodes), [treeNodes]);

  const filteredNodes = useMemo(() => {
    if (!searchQuery) {
      return flattenedTree;
    }
    return flattenedTree.filter(node => {
      if (node.type !== 'note') {
        return false;
      }
      const note = node.item as Note;
      return note.content?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [flattenedTree, searchQuery]);

  const handleCancelSearch = () => {
    setIsSearchActive(false);
    setSearchQuery('');
  };

  const handleStartSearch = () => {
    setIsSearchActive(true);
  };

  return {
    isSearchActive,
    searchQuery,
    setSearchQuery,
    filteredNodes,
    handleCancelSearch,
    handleStartSearch,
  };
};
