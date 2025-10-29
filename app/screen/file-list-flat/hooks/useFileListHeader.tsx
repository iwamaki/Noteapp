import React, { useLayoutEffect } from 'react';
import { Text } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/types';
import { useCustomHeader, HeaderConfig } from '../../../components/CustomHeader';
import { useTheme } from '../../../design/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface UseFileListHeaderProps {
  isSelectionMode: boolean;
  selectedFileIds: Set<string>;
  selectedFolderIds: Set<string>;
  handleCancelSelection: () => void;
  handleDeleteSelected: () => Promise<void>;
  handleCopySelected: () => Promise<void>;
  handleOpenRenameModal: (id: string, type: 'file' | 'folder') => void;
  rightButtons?: HeaderConfig['rightButtons'];
  leftButtons?: HeaderConfig['leftButtons'];
  title?: React.ReactNode;
}

export const useFileListHeader = ({
  isSelectionMode,
  selectedFileIds,
  selectedFolderIds,
  handleCancelSelection,
  handleDeleteSelected,
  handleCopySelected,
  handleOpenRenameModal,
  rightButtons,
  leftButtons,
  title,
}: UseFileListHeaderProps) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { createHeaderConfig } = useCustomHeader();
  const { colors, typography } = useTheme();

  useLayoutEffect(() => {
    if (isSelectionMode) {
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

      if (selectedFolderIds.size === 1 && selectedFileIds.size === 0) {
        const selectedFolderId = Array.from(selectedFolderIds)[0];
        selectionRightButtons.unshift({
          title: '名前変更',
          onPress: () => handleOpenRenameModal(selectedFolderId, 'folder'),
          variant: 'secondary'
        });
      } else if (selectedFileIds.size === 1 && selectedFolderIds.size === 0) {
        const selectedFileId = Array.from(selectedFileIds)[0];
        selectionRightButtons.unshift({
          title: '名前変更',
          onPress: () => handleOpenRenameModal(selectedFileId, 'file'),
          variant: 'secondary'
        });
      }

      navigation.setOptions(
        createHeaderConfig({
          title: undefined,
          leftButtons: [
            { icon: <Ionicons name="close" size={24} color={colors.text} />, onPress: handleCancelSelection },
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
    navigation, createHeaderConfig, isSelectionMode, selectedFileIds.size,
    selectedFolderIds.size, handleCancelSelection, handleCopySelected,
    handleDeleteSelected, handleOpenRenameModal, colors, rightButtons, title, leftButtons
  ]);
};
