import React, { useLayoutEffect, useCallback } from 'react';
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
  handleOpenRenameModal: (id: string, type: 'note' | 'folder') => void;
  handleOpenMoveModal: () => void;
}

// ノート一覧画面のヘッダー設定を管理するカスタムフック
export const useNoteListHeader = ({
  isSelectionMode,
  selectedNoteIds,
  selectedFolderIds,
  handleCancelSelection,
  handleDeleteSelected,
  handleCopySelected,
  handleOpenRenameModal,
  handleOpenMoveModal,
}: UseNoteListHeaderProps) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { createHeaderConfig } = useCustomHeader();
  const { colors } = useTheme();

  const renderTitle = useCallback((count: number): React.ReactNode => (
    <Text style={{ color: colors.text }}>{count}件選択中</Text>
  ), [colors.text]);

  // カスタムヘッダーの設定
  useLayoutEffect(() => {
    if (isSelectionMode) {
      const selectedCount = selectedNoteIds.size + selectedFolderIds.size;
      const rightButtons: HeaderConfig['rightButtons'] = [
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

      // フォルダが1つだけ選択されている場合に「名前変更」ボタンを追加
      if (selectedFolderIds.size === 1 && selectedNoteIds.size === 0) {
        const selectedFolderId = Array.from(selectedFolderIds)[0];
        rightButtons.unshift({
          title: '名前変更',
          onPress: () => handleOpenRenameModal(selectedFolderId, 'folder'),
          variant: 'secondary'
        });
      }

      // 選択中のアイテムがある場合に「移動」ボタンを追加
      if (selectedCount > 0) {
        rightButtons.unshift({
          title: '移動',
          onPress: handleOpenMoveModal,
          variant: 'secondary'
        });
      }

      navigation.setOptions(
        createHeaderConfig({
          title: renderTitle(selectedCount),
          leftButtons: [
            { title: 'キャンセル', onPress: handleCancelSelection, variant: 'secondary' },
          ],
          rightButtons: rightButtons,
        })
      );
    } else {
      navigation.setOptions(
        createHeaderConfig({
          rightButtons: [
            { icon: <Ionicons name="settings-outline" size={24} color={colors.primary} />, onPress: () => navigation.navigate('Settings'), variant: 'primary' },
          ],
        })
      );
    }
  }, [navigation, createHeaderConfig, isSelectionMode, selectedNoteIds.size, selectedFolderIds.size, handleCancelSelection, handleCopySelected, handleDeleteSelected, handleOpenRenameModal, handleOpenMoveModal, colors, renderTitle]);
};
