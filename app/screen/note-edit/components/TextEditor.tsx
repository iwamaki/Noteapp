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
      // flex: 1 と padding を削除
    },
    textEditor: {
      ...typography.body,
      fontFamily: 'monospace',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 0,
      paddingHorizontal: 8,
      paddingVertical: 8,
      backgroundColor: colors.background,
      color: colors.text,
      textAlignVertical: 'top',
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
