/**
 * @file useFileEditHeader.ts
 * @summary ファイル編集画面のヘッダー設定ロジックを管理するフック
 */

import React, { useLayoutEffect } from 'react';
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
  activeFileId: string | undefined;
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
  originalFileContent: string;
  currentContent: string;
}

export const useFileEditHeader = ({
  title,
  activeFileId,
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
  originalFileContent,
  currentContent,
}: UseFileEditHeaderProps) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { createHeaderConfig } = useCustomHeader();
  const { colors } = useTheme();

  useLayoutEffect(() => {
    const handleToggleViewMode = () => {
      onViewModeChange(viewMode === 'edit' ? 'preview' : 'edit');
    };

    const handleShowVersionHistory = () => {
            navigation.navigate('VersionHistory', { fileId: activeFileId || '' });
    };

    const handleShowDiffView = () => {
      navigation.navigate('DiffView', {
        mode: 'readonly',
        originalContent: originalFileContent,
        newContent: currentContent,
      });
    };

    const rightButtons: Array<React.ReactNode> = [];

    if (!isLoading) {
      rightButtons.push(
        <Ionicons
          name="save-outline"
          size={24}
          color={isDirty ? colors.primary : colors.textSecondary}
          onPress={onSave}
          disabled={!isDirty}
          style={styles.saveIcon}
        />
      );

      rightButtons.push(
        <FileEditOverflowMenu
          onToggleViewMode={handleToggleViewMode}
          onShowVersionHistory={handleShowVersionHistory}
          onShowDiffView={handleShowDiffView}
        />
      );
    }

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
    activeFileId,
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
    originalFileContent,
    currentContent,
  ]);
};

const styles = StyleSheet.create({
  saveIcon: {
    marginLeft: 16, // Add left margin to push it further right
  },
});
