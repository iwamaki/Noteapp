/**
 * @file useNoteEditHeader.ts
 * @summary ノート編集画面のヘッダー設定ロジックを管理するフック
 */

import React, { useLayoutEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { StyleSheet } from 'react-native';
import { RootStackParamList } from '../../../navigation/types';
import { useCustomHeader } from '../../../components/CustomHeader';
import { ViewMode } from '../components/FileEditor';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../design/theme/ThemeContext';
import { NoteEditHeader } from '../components/NoteEditHeader';
import { NoteEditOverflowMenu } from '../components/NoteEditOverflowMenu';

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
  isWordWrapEnabled: boolean;
  onToggleWordWrap: () => void;
  originalNoteContent: string;
  currentContent: string;
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
  isWordWrapEnabled,
  onToggleWordWrap,
  originalNoteContent,
  currentContent,
}: UseNoteEditHeaderProps) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { createHeaderConfig } = useCustomHeader();
  const { colors } = useTheme();

  useLayoutEffect(() => {
    const handleToggleViewMode = () => {
      onViewModeChange(viewMode === 'edit' ? 'preview' : 'edit');
    };

    const handleShowVersionHistory = () => {
            navigation.navigate('VersionHistory', { noteId: activeNoteId || '' });
    };

    const handleShowDiffView = () => {
      navigation.navigate('DiffView', {
        mode: 'readonly',
        originalContent: originalNoteContent,
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
        <NoteEditOverflowMenu
          onToggleViewMode={handleToggleViewMode}
          onShowVersionHistory={handleShowVersionHistory}
          onShowDiffView={handleShowDiffView}
          onToggleWordWrap={onToggleWordWrap}
          isWordWrapEnabled={isWordWrapEnabled}
        />
      );
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
        rightButtons: rightButtons.map((button, index) => ({ title: `button-${index}`, icon: button, onPress: () => {} })),
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
    isWordWrapEnabled,
    onToggleWordWrap,
    originalNoteContent,
    currentContent,
  ]);
};

const styles = StyleSheet.create({
  saveIcon: {
    marginLeft: 16, // Add left margin to push it further right
  },
});
