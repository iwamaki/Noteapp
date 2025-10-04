import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
    messageText: {
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.fontSize * 1.4,
    },
    userMessageText: {
      color: colors.background,
    },
    aiMessageText: {
      color: colors.text,
    },
    systemMessageText: {
      color: colors.text,
    },
  });

  let containerStyle: any[] = [styles.message];
  let textStyle: any[] = [styles.messageText];

  switch (message.role) {
    case 'user':
      containerStyle.push(styles.userMessage);
      textStyle.push(styles.userMessageText);
      break;
    case 'ai':
      containerStyle.push(styles.aiMessage);
      textStyle.push(styles.aiMessageText);
      break;
    case 'system':
      containerStyle.push(styles.systemMessage);
      textStyle.push(styles.systemMessageText);
      break;
  }

  return (
    <View style={containerStyle}>
      <Text style={textStyle}>{message.content}</Text>
    </View>
  );
};
