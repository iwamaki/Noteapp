/**
 * @file MarkdownPreview.tsx
 * @summary マークダウンコンテンツのプレビュー表示コンポーネント
 */

import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useTheme } from '../../../../theme/ThemeContext';

interface MarkdownPreviewProps {
  content: string;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content }) => {
  const { colors, typography } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
  });

  return (
    <ScrollView style={styles.container}>
      <Markdown
        style={{
          body: { color: colors.text, ...typography.body },
          heading1: { color: colors.text, ...typography.title },
          heading2: { color: colors.text, ...typography.subtitle },
        }}
      >
        {content}
      </Markdown>
    </ScrollView>
  );
};
