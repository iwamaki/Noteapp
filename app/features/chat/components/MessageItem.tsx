import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { ChatMessage } from '../llmService/index';
import { useTheme } from '../../../design/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

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
      backgroundColor: colors.tertiary,
      borderBottomLeftRadius: 4,
    },
    baseText: {
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.fontSize * 1.4,
    },
    message: {
      borderRadius: 16,
      marginVertical: 4,
      maxWidth: '85%',
      paddingHorizontal: 12,
      paddingVertical: 5,
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
      color: colors.white,
    },
    userMessage: {
      alignSelf: 'flex-end',
      backgroundColor: colors.primary,
      borderBottomRightRadius: 4,
    },

    attachedFileContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${colors.primary}15`,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
      marginTop: 2,
      marginBottom: 4,
      borderWidth: 1,
      borderColor: `${colors.primary}40`,
    },
    attachedFileIcon: {
      marginRight: 4,
    },
    attachedFileName: {
      fontSize: 11,
      color: colors.primary,
      fontWeight: '600',
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

  const markdownStyles = {
    body: StyleSheet.flatten(markdownTextStyle),
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
  };

  const markdownRules = {
    image: (node: any) => {
      // 画像表示機能が未実装のため、ここでは何もレンダリングしない
      // 必要に応じて、ここにプレースホルダーや代替テキストを表示するロジックを追加
      console.warn('Image rendering is not implemented yet. Image source:', node.attributes.src);
      return null;
    },
  };

  return (
    <>
      <View style={containerStyle}>
        <Markdown style={markdownStyles} rules={markdownRules}>{message.content}</Markdown>
      </View>
      {message.attachedFile && (
        <View style={[styles.attachedFileContainer, message.role === 'user' ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
          <Ionicons
            name="document-text"
            size={12}
            color={colors.primary}
            style={styles.attachedFileIcon}
          />
          <Text style={styles.attachedFileName} numberOfLines={1}>
            {message.attachedFile.filename}
          </Text>
        </View>
      )}
    </>
  );
};
