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
    aiMarkdownText: {
      color: colors.text,
    },
    aiMessage: {
      alignSelf: 'flex-start',
      backgroundColor: colors.secondary,
      borderColor: colors.border,
      borderWidth: 1,
    },
    baseText: {
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.fontSize * 1.4,
    },
        // Markdown styles
    markdownContainer: {
      // Markdownコンポーネントが適用されるViewのスタイル
    },
    message: {
      borderRadius: 8,
      marginVertical: 4,
      maxWidth: '85%',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    systemMarkdownText: {
      color: colors.text,
    },
    systemMessage: {
      alignSelf: 'center',
      backgroundColor: colors.warning + '30', // warning with opacity
      borderColor: colors.warning,
      borderWidth: 1,
    },    
    userMarkdownText: {
      color: colors.background,
    },
    userMessage: {
      alignSelf: 'flex-end',
      backgroundColor: colors.primary,
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
