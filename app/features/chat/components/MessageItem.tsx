import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { ChatMessage, TokenUsageInfo } from '../llmService/index';
import { useTheme } from '../../../design/theme/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getTokenUsageRatio, getAIIconName } from '../utils/tokenUsageHelpers';
import { CHAT_CONFIG } from '../config/chatConfig';

interface MessageItemProps {
  message: ChatMessage;
  tokenUsage: TokenUsageInfo | null;
  isLoading: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, tokenUsage, isLoading }) => {
  const { colors, typography, iconSizes } = useTheme();

  // トークン使用量に応じたアイコンを選択
  const usageRatio = getTokenUsageRatio(message, tokenUsage);
  const aiIconName = getAIIconName(usageRatio, isLoading);

  const styles = StyleSheet.create({
    aiMarkdownText: {
      color: colors.text,
    },
    aiMessage: {
      backgroundColor: colors.secondary,
      borderBottomLeftRadius: CHAT_CONFIG.components.border.radius.small,
      borderWidth: CHAT_CONFIG.components.border.width,
      borderColor: colors.border,
    },
    aiMessageWrapper: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      alignSelf: 'flex-start',
      marginVertical: CHAT_CONFIG.components.spacing.sm,
      maxWidth: CHAT_CONFIG.components.message.maxWidth,
    },
    aiIcon: {
      marginRight: CHAT_CONFIG.components.spacing.md,
      marginBottom: CHAT_CONFIG.components.spacing.sm,
    },
    baseText: {
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.fontSize * 1.4,
    },
    message: {
      borderRadius: CHAT_CONFIG.components.border.radius.large,
      paddingHorizontal: CHAT_CONFIG.components.spacing.xl,
      paddingVertical: 5,
    },
    systemMarkdownText: {
      color: colors.text,
    },
    systemMessage: {
      alignSelf: 'stretch',  // 横幅いっぱいに広がる
      backgroundColor: colors.warning + '30', // warning with opacity
      borderColor: colors.warning,
      borderWidth: CHAT_CONFIG.components.border.width,
      marginVertical: CHAT_CONFIG.components.spacing.sm,
      marginHorizontal: CHAT_CONFIG.components.spacing.xxl,  // 左右に余白を確保
    },
    userMarkdownText: {
      color: colors.white,
    },
    userMessage: {
      alignSelf: 'flex-end',
      backgroundColor: colors.primary,
      borderBottomRightRadius: CHAT_CONFIG.components.border.radius.small,
      marginVertical: CHAT_CONFIG.components.spacing.sm,
      maxWidth: CHAT_CONFIG.components.message.maxWidth,
    },

    attachedFileContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${colors.primary}15`,
      paddingHorizontal: CHAT_CONFIG.components.spacing.md,
      paddingVertical: CHAT_CONFIG.components.spacing.xs,
      borderRadius: CHAT_CONFIG.components.border.radius.medium,
      marginTop: CHAT_CONFIG.components.spacing.xs,
      marginBottom: CHAT_CONFIG.components.spacing.sm,
      borderWidth: CHAT_CONFIG.components.border.width,
      borderColor: `${colors.primary}40`,
    },
    attachedFileContainerUser: {
      alignSelf: 'flex-end',
    },
    attachedFileContainerAI: {
      alignSelf: 'flex-start',
    },
    attachedFileIcon: {
      marginRight: CHAT_CONFIG.components.spacing.sm,
    },
    attachedFileName: {
      fontSize: CHAT_CONFIG.components.fontSize.small,
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
  };

  const markdownRules = {
    image: (node: any) => {
      // 画像表示機能が未実装のため、ここでは何もレンダリングしない
      // 必要に応じて、ここにプレースホルダーや代替テキストを表示するロジックを追加
      console.warn('Image rendering is not implemented yet. Image source:', node.attributes.src);
      return null;
    },
  };

  // 要約済みメッセージのスタイル（薄く表示）
  const summarizedStyle = message.isSummarized ? { opacity: CHAT_CONFIG.components.opacity.summarized } : {};

  // AIメッセージの場合、アイコン付きのレイアウトを使用
  if (message.role === 'ai') {
    return (
      <>
        <View style={[styles.aiMessageWrapper, summarizedStyle]}>
          <MaterialCommunityIcons
            name={aiIconName as any}
            size={iconSizes.medium}
            color={colors.primary}
            style={styles.aiIcon}
          />
          <View style={containerStyle}>
            <Markdown style={markdownStyles} rules={markdownRules}>{message.content}</Markdown>
          </View>
        </View>
        {message.attachedFiles && message.attachedFiles.length > 0 && (
          <>
            {message.attachedFiles.map((file, index) => (
              <View
                key={`${file.filename}-${index}`}
                style={[styles.attachedFileContainer, styles.attachedFileContainerAI, summarizedStyle]}
              >
                <Ionicons
                  name="document-text"
                  size={CHAT_CONFIG.components.icon.small}
                  color={colors.primary}
                  style={styles.attachedFileIcon}
                />
                <Text style={styles.attachedFileName} numberOfLines={1}>
                  {file.filename}
                </Text>
              </View>
            ))}
          </>
        )}
      </>
    );
  }

  // ユーザーメッセージとシステムメッセージは従来通り
  return (
    <>
      <View style={[containerStyle, summarizedStyle]}>
        <Markdown style={markdownStyles} rules={markdownRules}>{message.content}</Markdown>
      </View>
      {message.attachedFiles && message.attachedFiles.length > 0 && (
        <>
          {message.attachedFiles.map((file, index) => (
            <View
              key={`${file.filename}-${index}`}
              style={[styles.attachedFileContainer, message.role === 'user' ? styles.attachedFileContainerUser : styles.attachedFileContainerAI, summarizedStyle]}
            >
              <Ionicons
                name="document-text"
                size={CHAT_CONFIG.components.icon.small}
                color={colors.primary}
                style={styles.attachedFileIcon}
              />
              <Text style={styles.attachedFileName} numberOfLines={1}>
                {file.filename}
              </Text>
            </View>
          ))}
        </>
      )}
    </>
  );
};
