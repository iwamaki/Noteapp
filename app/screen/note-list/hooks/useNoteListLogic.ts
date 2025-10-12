import { useEffect, useCallback, useState } from 'react';
import { useNavigation, NavigationProp, useIsFocused } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/types';
import { FileSystemItem, Folder, Note } from '@shared/types/note';
import { NoteListStorage, PathUtils } from '../noteStorage';
import { useFolderNavigation } from './useFolderNavigation';
import { buildTree, flattenTree, TreeNode } from '../utils/treeUtils';

export const useNoteListLogic = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const folderNav = useFolderNavigation();

  // State management using useState
  const [items, setItems] = useState<FileSystemItem[]>([]);
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());

  // Rename modal state
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [itemToRename, setItemToRename] = useState<FileSystemItem | null>(null);

  // Move mode state
  const [isMoveMode, setIsMoveMode] = useState(false); // New state for move mode
  const [itemsToMove, setItemsToMove] = useState<FileSystemItem[]>([]);

  // Function to fetch items (notes and folders) for tree view
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      // 既存データの移行を試行
      await NoteListStorage.migrateExistingNotes();

      // すべてのフォルダとノートを取得
      const folders = await NoteListStorage.getAllFolders();
      const notes = await NoteListStorage.getAllNotes();

      // ツリー構造を構築
      const tree = buildTree(folders, notes, expandedFolderIds);
      setTreeNodes(tree);

      // 後方互換性のため、現在のパスのアイテムも保持
      const fetchedItems = await NoteListStorage.getItemsByPath(folderNav.currentPath);
      setItems(fetchedItems);
    } catch (error) {
      console.error("Failed to fetch items:", error);
    } finally {
      setLoading(false);
    }
  }, [folderNav.currentPath, expandedFolderIds]);

  // Fetch items on screen focus or when path changes
  useEffect(() => {
    if (isFocused) {
      fetchItems();
    }
  }, [isFocused, fetchItems]);

  // Toggle folder expand/collapse
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

  // Item selection handler (tree version)
  const handleSelectItem = useCallback((item: FileSystemItem) => {
    if (isMoveMode) { // If in move mode, tapping a folder selects it as destination
      if (item.type === 'folder') {
        handleSelectDestinationFolder(item.item as Folder);
      }
      return; // Prevent normal selection behavior in move mode
    }

    if (item.type === 'folder') {
      if (isSelectionMode) {
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
        // フォルダの展開/折りたたみ（画面遷移なし）
        toggleFolderExpand(item.item.id);
      }
    } else {
      if (isSelectionMode) {
        setSelectedNoteIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(item.item.id)) {
            newSet.delete(item.item.id);
          } else {
            newSet.add(item.item.id);
          }
          return newSet;
        });
      } else {
        navigation.navigate('NoteEdit', { noteId: item.item.id });
      }
    }
  }, [isMoveMode, isSelectionMode, navigation, toggleFolderExpand]); // Added isMoveMode to dependencies

  // Item long press handler
  const handleLongPressItem = useCallback((item: FileSystemItem) => {
    if (!isSelectionMode && !isMoveMode) { // Prevent long press if in move mode
      setIsSelectionMode(true);
      if (item.type === 'folder') {
        setSelectedFolderIds(new Set([item.item.id]));
      } else {
        setSelectedNoteIds(new Set([item.item.id]));
      }
    }
  }, [isSelectionMode, isMoveMode]); // Added isMoveMode to dependencies

  // Cancel selection handler
  const handleCancelSelection = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedNoteIds(new Set());
    setSelectedFolderIds(new Set());
  }, []);

  // Delete selected items handler
  const handleDeleteSelected = useCallback(async () => {
    try {
      // ノートを削除
      if (selectedNoteIds.size > 0) {
        await NoteListStorage.deleteNotes(Array.from(selectedNoteIds));
      }
      // フォルダを削除（中身も削除）
      if (selectedFolderIds.size > 0) {
        for (const folderId of selectedFolderIds) {
          await NoteListStorage.deleteFolder(folderId, true);
        }
      }
      await fetchItems();
      handleCancelSelection();
    } catch (error) {
      console.error("Failed to delete selected items:", error);
    }
  }, [selectedNoteIds, selectedFolderIds, fetchItems, handleCancelSelection]);

  // Copy selected notes handler
  const handleCopySelected = useCallback(async () => {
    try {
      if (selectedNoteIds.size > 0) {
        await NoteListStorage.copyNotes(Array.from(selectedNoteIds));
      }
      await fetchItems();
      handleCancelSelection();
    } catch (error) {
      console.error("Failed to copy selected notes:", error);
    } 
  }, [selectedNoteIds, fetchItems, handleCancelSelection]);

  // Create note handler
  const handleCreateNote = useCallback(async () => {
    try {
      const newNote = await NoteListStorage.createNote({
        title: '新しいノート',
        content: '',
        path: folderNav.currentPath,
      });
      await fetchItems();
      navigation.navigate('NoteEdit', { noteId: newNote.id });
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  }, [navigation, fetchItems, folderNav.currentPath]);

  // Create note with path handler (auto folder creation)
  const handleCreateNoteWithPath = useCallback(async (inputPath: string) => {
    try {
      const newNote = await NoteListStorage.createNoteWithPath(inputPath, folderNav.currentPath);
      await fetchItems();
      navigation.navigate('NoteEdit', { noteId: newNote.id });
    } catch (error) {
      console.error("Failed to create note with path:", error);
    }
  }, [navigation, fetchItems, folderNav.currentPath]);

  // Create folder handler
  const handleCreateFolder = useCallback(async (folderName: string) => {
    try {
      await NoteListStorage.createFolder({
        name: folderName,
        path: folderNav.currentPath,
      });
      await fetchItems();
    } catch (error) {
      console.error("Failed to create folder:", error);
    }
  }, [fetchItems, folderNav.currentPath]);

  // Open rename modal
  const handleOpenRenameModal = useCallback((id: string, type: 'note' | 'folder') => {
    const item = items.find(i => i.item.id === id && i.type === type);
    if (item) {
      setItemToRename(item);
      setIsRenameModalVisible(true);
    }
  }, [items]);

  // Handle rename action
  const handleRenameItem = useCallback(async (newName: string) => {
    if (!itemToRename) return;

    try {
      if (itemToRename.type === 'folder') {
        await NoteListStorage.updateFolder({
          id: itemToRename.item.id,
          name: newName,
          path: itemToRename.item.path, // pathは変更しない
        });
      } else if (itemToRename.type === 'note') {
        await NoteListStorage.updateNote({
          id: itemToRename.item.id,
          title: newName,
        });
      }
      await fetchItems();
      handleCancelSelection();
    } catch (error) {
      console.error("Failed to rename item:", error);
    } finally {
      setItemToRename(null);
      setIsRenameModalVisible(false);
    }
  }, [itemToRename, fetchItems, handleCancelSelection]);

  // Start move mode
  const startMoveMode = useCallback(() => {
    const selectedItems: FileSystemItem[] = [];
    const flattened = flattenTree(treeNodes);

    selectedNoteIds.forEach(id => {
      const node = flattened.find(node => node.type === 'note' && node.item.id === id);
      if (node) selectedItems.push({ type: 'note', item: node.item as Note });
    });
    selectedFolderIds.forEach(id => {
      const node = flattened.find(node => node.type === 'folder' && node.item.id === id);
      if (node) selectedItems.push({ type: 'folder', item: node.item as Folder });
    });

    if (selectedItems.length > 0) {
      setItemsToMove(selectedItems);
      setIsMoveMode(true);
      setIsSelectionMode(false); // Exit selection mode when entering move mode
      setSelectedNoteIds(new Set());
      setSelectedFolderIds(new Set());
    }
  }, [selectedNoteIds, selectedFolderIds, items]);

  // Cancel move mode
  const cancelMoveMode = useCallback(() => {
    setIsMoveMode(false);
    setItemsToMove([]);
  }, []);

  // Handle move action to a destination folder
  const handleSelectDestinationFolder = useCallback(async (destinationFolder: Folder) => {
    if (itemsToMove.length === 0) return;

    try {
      for (const item of itemsToMove) {
        if (item.type === 'note') {
          await NoteListStorage.moveNote(item.item.id, PathUtils.getFullPath(destinationFolder.path, destinationFolder.name));
        } else if (item.type === 'folder') {
          // フォルダのパスを変更する（名前は変更しない）
          await NoteListStorage.updateFolder({
            id: item.item.id,
            path: PathUtils.getFullPath(destinationFolder.path, destinationFolder.name),
          });
        }
      }
      await fetchItems();
      cancelMoveMode(); // Reset move mode after successful move
      handleCancelSelection(); // Also clear any lingering selection
    } catch (error) {
      console.error("Failed to move items:", error);
    } finally {
      setItemsToMove([]);
    }
  }, [itemsToMove, fetchItems, cancelMoveMode, handleCancelSelection]);

  return {
    items,
    treeNodes,
    loading: { isLoading: loading },
    isSelectionMode,
    selectedNoteIds,
    selectedFolderIds,
    handleSelectItem,
    handleLongPressItem,
    handleCancelSelection,
    handleDeleteSelected,
    handleCopySelected,
    handleCreateNote,
    handleCreateNoteWithPath,
    handleCreateFolder,
    fetchItems,
    folderNavigation: folderNav,
    expandedFolderIds,
    isRenameModalVisible,
    itemToRename,
    handleOpenRenameModal,
    handleRenameItem,
    setIsRenameModalVisible,
    isMoveMode, // Expose new state
    itemsToMove,
    startMoveMode, // Expose new function
    cancelMoveMode, // Expose new function
    handleSelectDestinationFolder, // Expose new function
  };
};