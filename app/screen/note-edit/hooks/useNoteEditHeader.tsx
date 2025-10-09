/**
 * @file useNoteEditHeader.ts
 * @summary ノート編集画面のヘッダー設定ロジックを管理するフック
 */

import React, { useLayoutEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Alert } from 'react-native';
import { RootStackParamList } from '../../../navigation/types';
import { useCustomHeader } from '../../../components/CustomHeader';
import { ViewMode } from '../components/FileEditor';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../design/theme/ThemeContext';
import { NoteEditHeader } from '../components/NoteEditHeader';

interface UseNoteEditHeaderProps {
  title: string;
  activeNoteId: string | undefined;
  viewMode: ViewMode;
  isLoading: boolean;
  isEditable: boolean;
  isDirty: boolean;
  onTitleChange: (title: string) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const useNoteEditHeader = ({
  title,
  activeNoteId,
  viewMode,
  isLoading,
  isEditable,
  isDirty,
  onTitleChange,
  onViewModeChange,
  onSave,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: UseNoteEditHeaderProps) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { createHeaderConfig } = useCustomHeader();
  const { colors } = useTheme();

  useLayoutEffect(() => {
    const showMenu = () => {
      Alert.alert('メニュー', undefined, [
        {
          text: 'ビューモード切替',
          onPress: () => {
            if (viewMode === 'edit') {
              onViewModeChange('preview');
            } else {
              onViewModeChange('edit');
            }
          },
        },
        {
          text: 'バージョン履歴',
          onPress: () => {
            navigation.navigate('VersionHistory', { noteId: activeNoteId || '' });
          },
        },
        {
          text: 'キャンセル',
          style: 'cancel',
        },
      ]);
    };

    const rightButtons: Array<{
      title?: string;
      icon?: React.ReactNode;
      onPress: () => void;
      variant?: 'primary' | 'secondary' | 'danger';
      disabled?: boolean;
    }> = [];

    if (!isLoading) {
      rightButtons.push({
        icon: <Ionicons name="save-outline" size={24} color={isDirty ? colors.primary : colors.textSecondary} />,
        onPress: onSave,
        variant: 'primary',
        disabled: !isDirty,
      });

      rightButtons.push({
        icon: <Ionicons name="menu-outline" size={24} color={colors.textSecondary} />,
        onPress: showMenu,
        variant: 'secondary',
      });
    }

    navigation.setOptions(
      createHeaderConfig({
        title: (
          <NoteEditHeader
            title={title}
            onTitleChange={onTitleChange}
            editable={isEditable}
            onUndo={onUndo}
            onRedo={onRedo}
            canUndo={canUndo}
            canRedo={canRedo}
          />
        ),
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
    isEditable,
    isDirty,
    onTitleChange,
    onViewModeChange,
    onSave,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    createHeaderConfig,
    colors,
  ]);
};
