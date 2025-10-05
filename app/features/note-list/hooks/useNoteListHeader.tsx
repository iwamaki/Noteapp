import React, { useLayoutEffect, useCallback } from 'react';
import { Text } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/types';
import { useCustomHeader } from '../../../components/CustomHeader';
import { useTheme } from '../../../theme/ThemeContext';


interface UseNoteListHeaderProps {
  isSelectionMode: boolean;
  selectedNoteIds: Set<string>;
  handleCancelSelection: () => void;
  handleDeleteSelected: () => Promise<void>;
  handleCopySelected: () => Promise<void>;
}

// ノート一覧画面のヘッダー設定を管理するカスタムフック
export const useNoteListHeader = ({
  isSelectionMode,
  selectedNoteIds,
  handleCancelSelection,
  handleDeleteSelected,
  handleCopySelected,
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
      const selectedCount = selectedNoteIds.size;
      navigation.setOptions(
        createHeaderConfig({
          title: renderTitle(selectedCount),
          leftButtons: [
            { title: 'キャンセル', onPress: handleCancelSelection, variant: 'secondary' },
          ],
          rightButtons: [
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
          ],
        })
      );
    } else {
      navigation.setOptions(
        createHeaderConfig({
          rightButtons: [
            { title: '設定', onPress: () => navigation.navigate('Settings'), variant: 'primary' },
          ],
        })
      );
    }
  }, [navigation, createHeaderConfig, isSelectionMode, selectedNoteIds.size, handleCancelSelection, handleCopySelected, handleDeleteSelected, colors, renderTitle]);
};
