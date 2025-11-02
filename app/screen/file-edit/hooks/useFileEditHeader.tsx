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
  const { colors } = useTheme();
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
            title={
              <FileEditHeader
                title={title}
                category={category}
                onTitleChange={onTitleChange}
                editable={isEditable}
              />
            }
            leftButtons={[
              {
                icon: <Ionicons name="arrow-back-outline" size={24} color={colors.text} />,
                onPress: handleGoBack,
              },
            ]}
            rightButtons={
              isLoading
                ? []
                : [
                    {
                      icon: <Ionicons name="arrow-undo-outline" size={24} color={canUndo ? colors.primary : colors.textSecondary} />,
                      onPress: onUndo,
                      disabled: !canUndo,
                    },
                    {
                      icon: <Ionicons name="arrow-redo-outline" size={24} color={canRedo ? colors.primary : colors.textSecondary} />,
                      onPress: onRedo,
                      disabled: !canRedo,
                    },
                    {
                      icon: <Ionicons name="save-outline" size={24} color={isDirty ? colors.primary : colors.textSecondary} />,
                      onPress: onSave,
                      disabled: !isDirty,
                    },
                    {
                      icon: <Ionicons name="ellipsis-vertical" size={24} color={colors.text} />,
                      onPress: () => setMenuVisible(true),
                    },
                  ]
            }
          />
          <FileEditOverflowMenu
            visible={menuVisible}
            onClose={() => setMenuVisible(false)}
            onToggleViewMode={handleToggleViewMode}
          />
        </>
      ),
    });
  }, [
    navigation,
    title,
    category,
    isEditable,
    onTitleChange,
    handleGoBack,
    canUndo,
    canRedo,
    isDirty,
    isLoading,
    onUndo,
    onRedo,
    onSave,
    menuVisible,
    handleToggleViewMode,
    colors.text,
    colors.primary,
    colors.textSecondary,
  ]);
};
