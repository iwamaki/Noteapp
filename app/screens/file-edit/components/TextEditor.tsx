/**
 * @file TextEditor.tsx
 * @summary シンプルなテキスト編集コンポーネント
 */

import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { useTheme } from '@design/theme/ThemeContext';

interface TextEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  placeholder?: string;
}

const TextEditorComponent: React.FC<TextEditorProps> = ({
  content,
  onContentChange,
  placeholder = 'ファイルの内容を編集してください...',
}) => {
  const { colors, typography } = useTheme();

  const styles = StyleSheet.create({
    textEditor: {
      ...typography.body,
      fontFamily: 'monospace',
      lineHeight: typography.body.lineHeight,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      color: colors.text,
      textAlignVertical: 'top',
      flex: 1,
      padding: 10,
    },
  });

  return (
    <TextInput
      style={styles.textEditor}
      value={content}
      onChangeText={onContentChange}
      multiline
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      scrollEnabled={false}
    />
  );
};

TextEditorComponent.displayName = 'TextEditor';

export const TextEditor = React.memo(TextEditorComponent);
