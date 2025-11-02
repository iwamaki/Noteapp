/**
 * @file useFileEditHeader.ts
 * @summary ファイル編集画面のヘッダー設定ロジックを管理するフック
 */

import React, { useLayoutEffect, useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/types';
import { useCustomHeader } from '../../../components/CustomHeader';
import type { ViewMode } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../design/theme/ThemeContext';
import { FileEditHeader } from '../components/FileEditHeader';
import { FileEditOverflowMenu } from '../components/FileEditOverflowMenu';

interface UseFileEditHeaderProps {
  title: string;
  category: string;
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
  category,
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
      // Undo/Redoボタンを追加
      buttons.push(
        <Ionicons
          name="arrow-undo-outline"
          size={24}
          color={canUndo ? colors.primary : colors.textSecondary}
          onPress={onUndo}
          disabled={!canUndo}
        />
      );

      buttons.push(
        <Ionicons
          name="arrow-redo-outline"
          size={24}
          color={canRedo ? colors.primary : colors.textSecondary}
          onPress={onRedo}
          disabled={!canRedo}
        />
      );

      // 保存ボタン
      buttons.push(
        <Ionicons
          name="save-outline"
          size={24}
          color={isDirty ? colors.primary : colors.textSecondary}
          onPress={onSave}
          disabled={!isDirty}
        />
      );

      // オーバーフローメニュー
      buttons.push(
        <FileEditOverflowMenu
          onToggleViewMode={handleToggleViewMode}
        />
      );
    }

    return buttons;
  }, [isLoading, canUndo, canRedo, isDirty, colors.primary, colors.textSecondary, onUndo, onRedo, onSave, handleToggleViewMode]);

  // ヘッダー設定を更新（依存配列を最小化）
  useLayoutEffect(() => {
    navigation.setOptions(
      createHeaderConfig({
        title: (
          <FileEditHeader
            title={title}
            category={category}
            onTitleChange={onTitleChange}
            editable={isEditable}
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
    category,
    isEditable,
    onTitleChange,
    rightButtons,
    createHeaderConfig,
    colors.text,
  ]);
};
