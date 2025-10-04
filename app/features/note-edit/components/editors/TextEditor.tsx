/**
 * @file TextEditor.tsx
 * @summary テキスト編集コンポーネント
 */

import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../../../theme/ThemeContext';

interface TextEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  placeholder?: string;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  content,
  onContentChange,
  placeholder = 'ファイルの内容を編集してください...',
}) => {
  const { colors, typography } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    textEditor: {
      flex: 1,
      ...typography.body,
      fontFamily: 'monospace',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: colors.background,
      color: colors.text,
    },
  });

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.textEditor}
        value={content}
        onChangeText={onContentChange}
        multiline
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        textAlignVertical="top"
      />
    </View>
  );
};
