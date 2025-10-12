
import { useCallback, useState } from 'react';
import { NoteListStorage } from '../noteStorage';
import { PathUtils } from '../utils/pathUtils';
import { FileSystemItem, Folder, Note } from '@shared/types/note';
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
