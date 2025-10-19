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
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.secondary,
    },
    textEditor: {
      ...(wordWrap ? { flex: 1 } : {}),
      ...typography.body,
      fontFamily: 'monospace',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 0,
      paddingHorizontal: 8,
      paddingVertical: 8,
      backgroundColor: colors.background,
      color: colors.text,
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
        <ScrollView
          contentContainerStyle={styles.scrollViewContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          {editor}
        </ScrollView>
      ) : (
        <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={true}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: colors.secondary,
          }}
        >
          {editor}
        </ScrollView>
      )}
    </View>
  );
};
