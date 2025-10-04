/**
 * @file NoteEditHeader.tsx
 * @summary ノート編集画面のヘッダータイトル入力コンポーネント
 */

import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { responsive } from '../../../utils/commonStyles';

interface NoteEditHeaderProps {
  title: string;
  onTitleChange: (title: string) => void;
  editable: boolean;
}

export const NoteEditHeader: React.FC<NoteEditHeaderProps> = ({
  title,
  onTitleChange,
  editable,
}) => {
  const { colors, typography } = useTheme();

  const styles = StyleSheet.create({
    headerTitle: {
      ...typography.title,
      color: colors.text,
      width: responsive.getResponsiveSize(180, 200, 220),
      textAlign: 'left',
    },
  });

  return (
    <TextInput
      value={title}
      onChangeText={onTitleChange}
      style={styles.headerTitle}
      placeholder="ノートのタイトル"
      placeholderTextColor={colors.textSecondary}
      editable={editable}
    />
  );
};
