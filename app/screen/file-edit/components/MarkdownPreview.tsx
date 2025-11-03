/**
 * @file MarkdownPreview.tsx
 * @summary マークダウンコンテンツのプレビュー表示コンポーネント
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@design/theme/ThemeContext';
import { MarkdownRenderer } from '@design/markdown/MarkdownRenderer';

interface MarkdownPreviewProps {
  content: string;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content }) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      paddingTop: 0,
      paddingBottom: 12,
    },
  });

  return (
    <View style={styles.container}>
      <MarkdownRenderer content={content} />
    </View>
  );
};
