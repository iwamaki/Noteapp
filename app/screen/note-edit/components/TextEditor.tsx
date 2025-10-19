/**
 * @file TextEditor.tsx
 * @summary テキスト編集コンポーネント
 */

import React, { useState } from 'react';
import { View, TextInput, StyleSheet, useWindowDimensions } from 'react-native';
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
  const { width: windowWidth } = useWindowDimensions();

  // NoteEditScreenのScrollViewのpaddingHorizontalが16*2=32
  const parentHorizontalPadding = 32;
  const minWidth = windowWidth - parentHorizontalPadding;

  const [textInputWidth, setTextInputWidth] = useState(minWidth);

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
      minWidth: minWidth,
    },
  });

  // wordWrapがfalseの時だけ幅を動的に変更
  const dynamicEditorStyle = !wordWrap ? { width: textInputWidth } : {};

  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.textEditor, dynamicEditorStyle]}
        value={content}
        onChangeText={onContentChange}
        multiline
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        scrollEnabled={false} // TextInput自体のスクロールは親に委譲
        onContentSizeChange={
          !wordWrap
            ? (e) => {
                // コンテンツの幅が最小幅より大きい場合のみ更新
                setTextInputWidth(Math.max(minWidth, e.nativeEvent.contentSize.width));
              }
            : undefined
        }
      />
    </View>
  );
};
