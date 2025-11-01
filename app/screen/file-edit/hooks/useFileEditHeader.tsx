/**
 * @file useFileEditHeader.ts
 * @summary ファイル編集画面のヘッダー設定ロジックを管理するフック
 */

import React, { useLayoutEffect, useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { StyleSheet } from 'react-native';
import { RootStackParamList } from '../../../navigation/types';
import { useCustomHeader } from '../../../components/CustomHeader';
import type { ViewMode } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../design/theme/ThemeContext';
import { FileEditHeader } from '../components/FileEditHeader';
import { FileEditOverflowMenu } from '../components/FileEditOverflowMenu';

interface UseFileEditHeaderProps {
  title: string;
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

export const useFileEditHeader = ({
  title,
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
}: UseFileEditHeaderProps) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { createHeaderConfig } = useCustomHeader();
  const { colors } = useTheme();

  // ビューモード切り替えハンドラをメモ化
  const handleToggleViewMode = useCallback(() => {
    onViewModeChange(viewMode === 'edit' ? 'preview' : 'edit');
  }, [viewMode, onViewModeChange]);

  // 右側のボタン群をメモ化
  const rightButtons = useMemo(() => {
    const buttons: Array<React.ReactNode> = [];

    if (!isLoading) {
      buttons.push(
        <Ionicons
          name="save-outline"
          size={24}
          color={isDirty ? colors.primary : colors.textSecondary}
          onPress={onSave}
          disabled={!isDirty}
          style={styles.saveIcon}
        />
      );

      buttons.push(
        <FileEditOverflowMenu
          onToggleViewMode={handleToggleViewMode}
        />
      );
    }

    return buttons;
  }, [isLoading, isDirty, colors.primary, colors.textSecondary, onSave, handleToggleViewMode]);

  // ヘッダー設定を更新（依存配列を最小化）
  useLayoutEffect(() => {
    navigation.setOptions(
      createHeaderConfig({
        title: (
          <FileEditHeader
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
            icon: <Ionicons name="arrow-back-outline" size={24} color={colors.text} />,
            onPress: () => navigation.goBack(),
            variant: 'secondary',
          },
        ],
        rightButtons: rightButtons.map((button, index) => ({ title: `button-${index}`, icon: button, onPress: () => {} })),
      })
    );
  }, [
    navigation,
    title,
    isEditable,
    onTitleChange,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    rightButtons,
    createHeaderConfig,
    colors.text,
  ]);
};

const styles = StyleSheet.create({
  saveIcon: {
    marginLeft: 16, // Add left margin to push it further right
  },
});
