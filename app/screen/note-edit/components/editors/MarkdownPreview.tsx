/**
 * @file MarkdownPreview.tsx
 * @summary マークダウンコンテンツのプレビュー表示コンポーネント
 */

import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useTheme } from '../../../../design/theme/ThemeContext';

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

  const markdownRules = {
    image: (node: any) => {
      // 画像表示機能が未実装のため、ここでは何もレンダリングしない
      // 必要に応じて、ここにプレースホルダーや代替テキストを表示するロジックを追加
      console.warn('Image rendering is not implemented yet. Image source:', node.attributes.src);
      return null;
    },
  };

  return (
    <ScrollView style={styles.container}>
      <Markdown
        style={{
          body: { color: colors.text, ...typography.body },
          heading1: { color: colors.text, ...typography.title },
          heading2: { color: colors.text, ...typography.subtitle },
        }}
        rules={markdownRules}
      >
        {content}
      </Markdown>
    </ScrollView>
  );
};
