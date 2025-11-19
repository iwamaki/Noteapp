/**
 * @file useFileEditHeader.tsx
 * @summary ファイル編集画面のヘッダーロジックを管理するフック
 * @responsibility ボタンの状態管理とイベントハンドラーのみを担当し、
 *                レイアウト構造はCustomHeaderコンポーネントに委譲する
 */

import React, { useLayoutEffect, useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../../navigation/types';
import { CustomHeader } from '../../../components/CustomHeader';
import { useTheme } from '../../../design/theme/ThemeContext';
import type { ViewMode } from '../types';
import { FileEditOverflowMenu } from '../components/FileEditOverflowMenu';

interface UseFileEditHeaderProps {
  viewMode: ViewMode;
  isLoading: boolean;
  isDirty: boolean;
  onViewModeChange: (mode: ViewMode) => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const useFileEditHeader = ({
  viewMode,
  isLoading,
  isDirty,
  onViewModeChange,
  onSave,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: UseFileEditHeaderProps) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { colors, iconSizes } = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);

  // ビューモード切り替えハンドラをメモ化
  const handleToggleViewMode = useCallback(() => {
    onViewModeChange(viewMode === 'edit' ? 'preview' : 'edit');
  }, [viewMode, onViewModeChange]);

  // 戻るボタンハンドラ
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ヘッダー設定を更新
  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <>
          <CustomHeader
            leftButtons={[
              {
                icon: <Ionicons name="arrow-back-outline" size={iconSizes.medium} color={colors.text} />,
                onPress: handleGoBack,
              },
            ]}
            rightButtons={
              isLoading
                ? []
                : [
                    {
                      icon: <Ionicons name="arrow-undo-outline" size={iconSizes.medium} color={canUndo ? colors.primary : colors.textSecondary} />,
                      onPress: onUndo,
                      disabled: !canUndo,
                    },
                    {
                      icon: <Ionicons name="arrow-redo-outline" size={iconSizes.medium} color={canRedo ? colors.primary : colors.textSecondary} />,
                      onPress: onRedo,
                      disabled: !canRedo,
                    },
                    {
                      icon: <Ionicons name="save-outline" size={iconSizes.medium} color={isDirty ? colors.primary : colors.textSecondary} />,
                      onPress: onSave,
                      disabled: !isDirty,
                    },
                    {
                      icon: <Ionicons name={viewMode === 'edit' ? 'eye-outline' : 'create-outline'} size={iconSizes.medium} color={colors.text} />,
                      onPress: handleToggleViewMode,
                    },
                    {
                      icon: <Ionicons name="ellipsis-vertical" size={iconSizes.medium} color={colors.text} />,
                      onPress: () => setMenuVisible(true),
                    },
                  ]
            }
          />
          <FileEditOverflowMenu
            visible={menuVisible}
            onClose={() => setMenuVisible(false)}
          />
        </>
      ),
    });
  }, [
    navigation,
    handleGoBack,
    canUndo,
    canRedo,
    isDirty,
    isLoading,
    onUndo,
    onRedo,
    onSave,
    viewMode,
    menuVisible,
    handleToggleViewMode,
    colors.text,
    colors.primary,
    colors.textSecondary,
    iconSizes.medium,
  ]);
};
