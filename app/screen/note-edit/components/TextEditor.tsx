/**
 * @file TextEditor.tsx
 * @summary テキスト編集コンポーネント
 */

import React from 'react';
import { View, TextInput, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@design/theme/ThemeContext';

interface TextEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  placeholder?: string;
  wordWrap?: boolean;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  content,
  onContentChange,
  placeholder = 'ファイルの内容を編集してください...',
  wordWrap = true,
}) => {
  const { colors, typography } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollViewContainer: {
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
      minWidth: wordWrap ? undefined : '1000%', // 折り返しなしの場合、非常に広い幅を確保
    },
  });

  const editor = (
    <TextInput
      style={styles.textEditor}
      value={content}
      onChangeText={onContentChange}
      multiline
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      textAlignVertical="top"
    />
  );

  return (
    <View style={styles.container}>
      {wordWrap ? (
        <View style={styles.scrollViewContainer}>{editor}</View>
      ) : (
        <ScrollView horizontal>
          <View style={styles.scrollViewContainer}>{editor}</View>
        </ScrollView>
      )}
    </View>
  );
};
