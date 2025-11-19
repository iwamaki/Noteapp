import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { ChatMessage, TokenUsageInfo } from '../../llmService/index';
import { useTheme } from '../../../design/theme/ThemeContext';
import { MarkdownRenderer } from '../../../design/markdown/MarkdownRenderer';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getTokenUsageRatio, getAIIconName } from '../utils/tokenUsageHelpers';
import { CHAT_CONFIG } from '../config/chatConfig';

interface MessageItemProps {
  message: ChatMessage;
  tokenUsage: TokenUsageInfo | null;
  isLoading: boolean;
}

const MessageItemComponent: React.FC<MessageItemProps> = ({ message, tokenUsage, isLoading }) => {
  const { colors, iconSizes } = useTheme();

  // トークン使用量に応じたアイコンを選択
  const usageRatio = getTokenUsageRatio(message, tokenUsage);
  const aiIconName = getAIIconName(usageRatio, isLoading);

  const styles = StyleSheet.create({
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
    message: {
      borderRadius: CHAT_CONFIG.components.border.radius.large,
      padding: CHAT_CONFIG.components.spacing.xl,
    },
    systemMessage: {
      alignSelf: 'stretch',  // 横幅いっぱいに広がる
      backgroundColor: colors.warning + '30', // warning with opacity
      borderColor: colors.warning,
      borderWidth: CHAT_CONFIG.components.border.width,
      marginVertical: CHAT_CONFIG.components.spacing.sm,
      marginHorizontal: CHAT_CONFIG.components.spacing.xxl,  // 左右に余白を確保
    },
    userMessage: {
      alignSelf: 'flex-end',
      backgroundColor: colors.primary,
      borderBottomRightRadius: CHAT_CONFIG.components.border.radius.small,
      marginVertical: CHAT_CONFIG.components.spacing.sm,
      marginRight: 4,
      maxWidth: CHAT_CONFIG.components.message.maxWidth,
    },

    attachedFileContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${colors.primary}15`,
      paddingHorizontal: CHAT_CONFIG.components.spacing.md,
      paddingVertical: CHAT_CONFIG.components.spacing.xs,
      borderRadius: CHAT_CONFIG.components.border.radius.medium,
      marginTop: 0,
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
  let textColor: string;

  switch (message.role) {
    case 'user':
      containerStyle.push(styles.userMessage);
      textColor = colors.white;
      break;
    case 'ai':
      containerStyle.push(styles.aiMessage);
      textColor = colors.text;
      break;
    case 'system':
      containerStyle.push(styles.systemMessage);
      textColor = colors.text;
      break;
    default:
      textColor = colors.text;
  }

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
            <MarkdownRenderer content={message.content} textColor={textColor} />
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
        <MarkdownRenderer content={message.content} textColor={textColor} />
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

MessageItemComponent.displayName = 'MessageItem';

export const MessageItem = React.memo(MessageItemComponent);
