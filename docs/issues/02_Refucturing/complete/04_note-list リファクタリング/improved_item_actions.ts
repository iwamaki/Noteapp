// app/screen/note-list/hooks/useItemActions.ts (改善版)
import { useCallback, useState } from 'react';
import { PathUtils } from '../utils/pathUtils';
import { FileSystemItem, Folder } from '@shared/types/note';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/types';
import { NoteService } from '../services/noteService';
import { useErrorHandler } from './useErrorHandler';

interface ItemActionsProps {
  selectedNoteIds: Set<string>;
  selectedFolderIds: Set<string>;
  currentPath: string;
  onSuccess: () => void;
}

export const useItemActions = ({
  selectedNoteIds,
  selectedFolderIds,
  currentPath,
  onSuccess,
}: ItemActionsProps) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { wrapAsync } = useErrorHandler();
  const [isMoveMode, setIsMoveMode] = useState(false);

  const handleDeleteSelected = useCallback(async () => {
    const result = await wrapAsync('削除', async () => {
      await NoteService.batchDelete({
        noteIds: Array.from(selectedNoteIds),
        folderIds: Array.from(selectedFolderIds),
      });
    });

    if (result !== null) {
      onSuccess();
    }
  }, [selectedNoteIds, selectedFolderIds, onSuccess, wrapAsync]);

  const handleCopySelected = useCallback(async () => {
    const result = await wrapAsync('コピー', async () => {
      await NoteService.copyNotes(Array.from(selectedNoteIds));
    });

    if (result !== null) {
      onSuccess();
    }
  }, [selectedNoteIds, onSuccess, wrapAsync]);

  const handleCreateItem = useCallback(async (inputPath: string) => {
    const newNote = await wrapAsync('作成', async () => {
      return await NoteService.createNoteWithPath(inputPath, currentPath);
    });

    if (newNote) {
      onSuccess();
      navigation.navigate('NoteEdit', { noteId: newNote.id });
    }
  }, [navigation, currentPath, onSuccess, wrapAsync]);

  const handleRenameItem = useCallback(async (
    item: FileSystemItem,
    newName: string
  ) => {
    const result = await wrapAsync('名前変更', async () => {
      await NoteService.renameItem(
        item.item.id,
        item.type,
        newName
      );
    });

    if (result !== null) {
      onSuccess();
    }
  }, [onSuccess, wrapAsync]);

  const startMoveMode = useCallback(() => {
    if (selectedNoteIds.size > 0 || selectedFolderIds.size > 0) {
      setIsMoveMode(true);
    }
  }, [selectedNoteIds, selectedFolderIds]);

  const cancelMoveMode = useCallback(() => {
    setIsMoveMode(false);
  }, []);

  const handleMoveItems = useCallback(async (destinationFolder: Folder) => {
    const destinationPath = PathUtils.getFullPath(
      destinationFolder.path,
      destinationFolder.name
    );

    const result = await wrapAsync('移動', async () => {
      await NoteService.batchMove({
        noteIds: Array.from(selectedNoteIds),
        folderIds: Array.from(selectedFolderIds),
        destinationPath,
      });
    });

    if (result !== null) {
      onSuccess();
      cancelMoveMode();
    }
  }, [selectedNoteIds, selectedFolderIds, onSuccess, cancelMoveMode, wrapAsync]);

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