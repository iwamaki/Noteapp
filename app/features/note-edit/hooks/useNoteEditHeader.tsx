/**
 * @file useNoteEditHeader.ts
 * @summary ノート編集画面のヘッダー設定ロジックを管理するフック
 */

import React, { useLayoutEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/types';
import { useCustomHeader } from '../../../components/CustomHeader';
import { ViewMode } from '../components/FileEditor';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';

interface UseNoteEditHeaderProps {
  title: string;
  activeNoteId: string | undefined;
  viewMode: ViewMode;
  isLoading: boolean;
  headerTitle: React.ReactNode;
  onViewModeChange: (mode: ViewMode) => void;
  onSave: () => void;
}

export const useNoteEditHeader = ({
  title,
  activeNoteId,
  viewMode,
  isLoading,
  headerTitle,
  onViewModeChange,
  onSave,
}: UseNoteEditHeaderProps) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { createHeaderConfig } = useCustomHeader();
  const { colors } = useTheme();

  useLayoutEffect(() => {
    const rightButtons: Array<{
      title?: string;
      icon?: React.ReactNode;
      onPress: () => void;
      variant?: 'primary' | 'secondary' | 'danger';
    }> = [];

    if (!isLoading) {
      // ビューモードに応じたボタン
      if (viewMode === 'content') {
        rightButtons.push({
          icon: <Ionicons name="pencil-outline" size={24} color={colors.primary} />,
          onPress: () => onViewModeChange('edit'),
          variant: 'primary',
        });
      } else if (viewMode === 'edit') {
        rightButtons.push({
          icon: <Ionicons name="eye-outline" size={24} color={colors.textSecondary} />,
          onPress: () => onViewModeChange('preview'),
          variant: 'secondary',
        });
      } else if (viewMode === 'preview') {
        rightButtons.push({
          icon: <Ionicons name="eye-off-outline" size={24} color={colors.primary} />,
          onPress: () => onViewModeChange('edit'),
          variant: 'primary',
        });
      }

      // 保存ボタン (常に表示)
      rightButtons.push({
        icon: <Ionicons name="save-outline" size={24} color={colors.primary} />,
        onPress: onSave,
        variant: 'primary',
      });

      // 履歴ボタン
      rightButtons.push({
        icon: <Ionicons name="time-outline" size={24} color={colors.textSecondary} />,
        onPress: () =>
          navigation.navigate('VersionHistory', { noteId: activeNoteId || '' }),
        variant: 'secondary',
      });
    }

    navigation.setOptions(
      createHeaderConfig({
        title: headerTitle,
        leftButtons: [
          {
            icon: <Ionicons name="arrow-back-outline" size={24} color={colors.textSecondary} />,
            onPress: () => navigation.goBack(),
            variant: 'secondary',
          },
        ],
        rightButtons,
      })
    );
  }, [
    navigation,
    title,
    activeNoteId,
    viewMode,
    isLoading,
    headerTitle,
    onViewModeChange,
    onSave,
    createHeaderConfig,
    colors,
  ]);
};
