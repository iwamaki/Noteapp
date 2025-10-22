import React, { useLayoutEffect } from 'react';
import { Text } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/types';
import { useCustomHeader, HeaderConfig } from '../../../components/CustomHeader';
import { useTheme } from '../../../design/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface UseNoteListHeaderProps {
  isSelectionMode: boolean;
  selectedNoteIds: Set<string>;
  selectedFolderIds: Set<string>;
  handleCancelSelection: () => void;
  handleDeleteSelected: () => Promise<void>;
  handleCopySelected: () => Promise<void>;
  handleOpenRenameModal: (id: string, type: 'file' | 'folder') => void;
  startMoveMode: () => void;
  isMoveMode: boolean;
  cancelMoveMode: () => void;
  rightButtons?: HeaderConfig['rightButtons'];
  leftButtons?: HeaderConfig['leftButtons'];
  title?: React.ReactNode;
}

export const useNoteListHeader = ({
  isSelectionMode,
  selectedNoteIds,
  selectedFolderIds,
  handleCancelSelection,
  handleDeleteSelected,
  handleCopySelected,
  handleOpenRenameModal,
  startMoveMode,
  isMoveMode,
  cancelMoveMode,
  rightButtons,
  leftButtons,
  title,
}: UseNoteListHeaderProps) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { createHeaderConfig } = useCustomHeader();
  const { colors, typography } = useTheme();

  useLayoutEffect(() => {
    if (isMoveMode) {
      navigation.setOptions(
        createHeaderConfig({
          title: <Text style={{ color: colors.text, fontSize: typography.subtitle.fontSize }}>移動先を選択</Text>,
          leftButtons: [
            { icon: <Ionicons name="arrow-back" size={24} color={colors.text} />, onPress: cancelMoveMode },
          ],
          rightButtons: [],
        })
      );
    } else if (isSelectionMode) {
      const selectedCount = selectedNoteIds.size + selectedFolderIds.size;
      const selectionRightButtons: HeaderConfig['rightButtons'] = [
        {
          title: 'コピー',
          onPress: handleCopySelected,
          variant: 'primary'
        },
        {
          title: '削除',
          onPress: handleDeleteSelected,
          variant: 'danger'
        },
      ];

      if (selectedFolderIds.size === 1 && selectedNoteIds.size === 0) {
        const selectedFolderId = Array.from(selectedFolderIds)[0];
        selectionRightButtons.unshift({
          title: '名前変更',
          onPress: () => handleOpenRenameModal(selectedFolderId, 'folder'),
          variant: 'secondary'
        });
      } else if (selectedNoteIds.size === 1 && selectedFolderIds.size === 0) {
        const selectedNoteId = Array.from(selectedNoteIds)[0];
        selectionRightButtons.unshift({
          title: '名前変更',
          onPress: () => handleOpenRenameModal(selectedNoteId, 'file'),
          variant: 'secondary'
        });
      }

      if (selectedCount > 0) {
        selectionRightButtons.unshift({
          title: '移動',
          onPress: startMoveMode,
          variant: 'secondary'
        });
      }

      navigation.setOptions(
        createHeaderConfig({
          title: undefined,
          leftButtons: [
            { icon: <Ionicons name="arrow-back" size={24} color={colors.text} />, onPress: handleCancelSelection },
          ],
          rightButtons: selectionRightButtons,
        })
      );
    } else {
      navigation.setOptions(
        createHeaderConfig({
          title,
          rightButtons: rightButtons,
          leftButtons: leftButtons,
        })
      );
    }
  }, [
    navigation, createHeaderConfig, isSelectionMode, selectedNoteIds.size,
    selectedFolderIds.size, handleCancelSelection, handleCopySelected,
    handleDeleteSelected, handleOpenRenameModal, startMoveMode, isMoveMode,
    cancelMoveMode, colors, typography, rightButtons, title, leftButtons
  ]);
};
