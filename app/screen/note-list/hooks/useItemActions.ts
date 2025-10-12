
import { useCallback, useState } from 'react';
import { NoteListStorage } from '../noteStorage';
import { PathUtils } from '../utils/pathUtils';
import { FileSystemItem, Folder } from '@shared/types/note';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/types';

interface ItemActionsProps {
  selectedNoteIds: Set<string>;
  selectedFolderIds: Set<string>;
  currentPath: string;
  onSuccess: () => void; // To trigger refresh and clear selection
}

export const useItemActions = ({
  selectedNoteIds,
  selectedFolderIds,
  currentPath,
  onSuccess,
}: ItemActionsProps) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [isMoveMode, setIsMoveMode] = useState(false);

  const handleDeleteSelected = useCallback(async () => {
    try {
      if (selectedNoteIds.size > 0) {
        await NoteListStorage.deleteNotes(Array.from(selectedNoteIds));
      }
      if (selectedFolderIds.size > 0) {
        for (const folderId of selectedFolderIds) {
          await NoteListStorage.deleteFolder(folderId, true);
        }
      }
      onSuccess();
    } catch (error) {
      console.error("Failed to delete selected items:", error);
    }
  }, [selectedNoteIds, selectedFolderIds, onSuccess]);

  const handleCopySelected = useCallback(async () => {
    try {
      if (selectedNoteIds.size > 0) {
        await NoteListStorage.copyNotes(Array.from(selectedNoteIds));
      }
      onSuccess();
    } catch (error) {
      console.error("Failed to copy selected notes:", error);
    }
  }, [selectedNoteIds, onSuccess]);

  const handleCreateItem = useCallback(async (inputPath: string) => {
    try {
      const newNote = await NoteListStorage.createNoteWithPath(inputPath, currentPath);
      onSuccess();
      navigation.navigate('NoteEdit', { noteId: newNote.id });
    } catch (error) {
      console.error("Failed to create note with path:", error);
    }
  }, [navigation, currentPath, onSuccess]);

  const handleRenameItem = useCallback(async (item: FileSystemItem, newName: string) => {
    try {
      if (item.type === 'folder') {
        await NoteListStorage.updateFolder({ id: item.item.id, name: newName });
      } else {
        await NoteListStorage.updateNote({ id: item.item.id, title: newName });
      }
      onSuccess();
    } catch (error) {
      console.error("Failed to rename item:", error);
    }
  }, [onSuccess]);

  const startMoveMode = useCallback(() => {
    if (selectedNoteIds.size > 0 || selectedFolderIds.size > 0) {
      setIsMoveMode(true);
    }
  }, [selectedNoteIds, selectedFolderIds]);

  const cancelMoveMode = useCallback(() => {
    setIsMoveMode(false);
  }, []);

  const handleMoveItems = useCallback(async (destinationFolder: Folder) => {
    try {
      const noteIds = Array.from(selectedNoteIds);
      const folderIds = Array.from(selectedFolderIds);
      const destinationPath = PathUtils.getFullPath(destinationFolder.path, destinationFolder.name);

      // 不正な移動を防ぐためのチェック
      if (folderIds.length > 0) {
        const allFolders = await NoteListStorage.getAllFolders();
        for (const folderId of folderIds) {
          const folderToMove = allFolders.find(f => f.id === folderId);
          if (!folderToMove) continue;

          const sourcePath = PathUtils.getFullPath(folderToMove.path, folderToMove.name);

          // フォルダを自分自身やその子孫に移動させない
          if (destinationPath.startsWith(sourcePath)) {
            console.error("Cannot move a folder into itself or a descendant.", { sourcePath, destinationPath });
            // TODO: ユーザーにエラーを通知する
            return;
          }
        }
      }

      for (const noteId of noteIds) {
        await NoteListStorage.moveNote(noteId, destinationPath);
      }
      for (const folderId of folderIds) {
        await NoteListStorage.updateFolder({ id: folderId, path: destinationPath });
      }
      
      onSuccess();
      cancelMoveMode();
    } catch (error) {
      console.error("Failed to move items:", error);
    }
  }, [selectedNoteIds, selectedFolderIds, onSuccess, cancelMoveMode]);

  return {
    handleDeleteSelected,
    handleCopySelected,
    handleCreateItem,
    handleRenameItem,
    moveMode: {
      isActive: isMoveMode,
      start: startMoveMode,
      cancel: cancelMoveMode,
      handleMove: handleMoveItems,
    },
  };
};
