import React from 'react';
import { View, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { ChatMessage } from '../../../services/llmService';
import { useTheme } from '../../../theme/ThemeContext';

interface MessageItemProps {
  message: ChatMessage;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const { colors, typography } = useTheme();

  const styles = StyleSheet.create({
    message: {
      marginVertical: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      maxWidth: '85%',
    },
    userMessage: {
      backgroundColor: colors.primary,
      alignSelf: 'flex-end',
    },
    aiMessage: {
      backgroundColor: colors.secondary,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: colors.border,
    },
    systemMessage: {
      backgroundColor: colors.warning + '30', // warning with opacity
      alignSelf: 'center',
      borderWidth: 1,
      borderColor: colors.warning,
    },
    // Markdown styles
    markdownContainer: {
      // Markdownコンポーネントが適用されるViewのスタイル
    },
    baseText: {
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.fontSize * 1.4,
    },
    userMarkdownText: {
      color: colors.background,
    },
    aiMarkdownText: {
      color: colors.text,
    },
    systemMarkdownText: {
      color: colors.text,
    },
  });

  let containerStyle: any[] = [styles.message];
  let markdownTextStyle: any[] = [styles.baseText];

  switch (message.role) {
    case 'user':
      containerStyle.push(styles.userMessage);
      markdownTextStyle.push(styles.userMarkdownText);
      break;
    case 'ai':
      containerStyle.push(styles.aiMessage);
      markdownTextStyle.push(styles.aiMarkdownText);
      break;
    case 'system':
      containerStyle.push(styles.systemMessage);
      markdownTextStyle.push(styles.systemMarkdownText);
      break;
  }

  const markdownStyles = StyleSheet.create({
    body: {
      ...StyleSheet.flatten(markdownTextStyle),
    },
    // 他のMarkdown要素のスタイルを必要に応じて追加
    // 例: heading1: { color: colors.text, fontSize: typography.h1.fontSize },
    // link: { color: colors.primary },
    // strong: { fontWeight: 'bold' },
    // em: { fontStyle: 'italic' },
    // code_inline: {
    //   backgroundColor: colors.border,
    //   padding: 2,
    //   borderRadius: 3,
    //   fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    // },
    // blockquote: {
    //   borderLeftColor: colors.primary,
    //   borderLeftWidth: 4,
    //   paddingLeft: 8,
    //   marginLeft: 8,
    // },
    // list_item: {
    //   color: colors.text,
    // },
  });

  return (
    <View style={containerStyle}>
      <Markdown style={markdownStyles}>{message.content}</Markdown>
    </View>
  );
};
