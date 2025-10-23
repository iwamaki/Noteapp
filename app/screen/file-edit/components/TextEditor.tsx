/**
 * @file TextEditor.tsx
 * @summary テキスト編集コンポーネント
 */

import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '@design/theme/ThemeContext';

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
    },
    textEditor: {
      ...typography.body,
      fontFamily: 'monospace',
      borderLeftWidth: 1,
      borderTopWidth: 0,
      borderRightWidth: 0,
      borderBottomWidth: 0,
      borderColor: colors.border,
      borderRadius: 0,
      backgroundColor: colors.background,
      color: colors.text,
      textAlignVertical: 'top',
      flex: 1, // Ensure TextInput fills available width
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
        scrollEnabled={false} // TextInput自体のスクロールは親に委譲
      />
    </View>
  );
};
