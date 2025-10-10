import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
  PanResponderInstance,
} from 'react-native';
import { ChatMessage } from '../../../services/llmService/index';
import { useTheme } from '../../../design/theme/ThemeContext';
import { MessageItem } from './MessageItem';

interface ChatHistoryProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onCollapse: () => void;
  onResetChat: () => void; // 追加
  messageAreaHeight: Animated.AnimatedValue;
  panHandlers: PanResponderInstance['panHandlers'];
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  messages,
  isLoading,
  onCollapse,
  onResetChat, // 追加
  messageAreaHeight,
  panHandlers,
}) => {
  const { colors, typography } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const styles = StyleSheet.create({
    collapseButton: {
      padding: 4,
    },    
    collapseButtonText: {
      color: colors.textSecondary,      
      fontSize: typography.subtitle.fontSize,
    },

    resetButton: {
      padding: 4,
      marginRight: 8, // ▽ボタンとの間にスペースを設ける
    },
    resetButtonText: {
      color: colors.textSecondary,
      fontSize: typography.subtitle.fontSize,
    },

    loadingContainer: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      paddingVertical: 12,
    },
    loadingText: {
      color: colors.primary,
      fontSize: typography.body.fontSize,
      marginLeft: 8,
    },

    messagesArea: {
      backgroundColor: colors.background,
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
      overflow: 'hidden',
    },
    messagesContent: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    messagesHeader: {
      alignItems: 'center',
      backgroundColor: colors.secondary,
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    messagesHeaderTitle: {
      color: colors.text,
      fontSize: typography.body.fontSize,
      fontWeight: '600',
    },

    headerButtonContainer: {
      flexDirection: 'row',
    },

    messagesScrollView: {
      flex: 1,
    },
  });

  return (
    <Animated.View style={[styles.messagesArea, { height: messageAreaHeight }]}>
      <View style={styles.messagesHeader} {...panHandlers}>
        <Text style={styles.messagesHeaderTitle}>チャット履歴</Text>
        <View style={styles.headerButtonContainer}>
          <TouchableOpacity onPress={onResetChat} style={styles.resetButton}>
            <Text style={styles.resetButtonText}>リセット</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCollapse} style={styles.collapseButton}>
            <Text style={styles.collapseButtonText}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesScrollView}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((msg, index) => (
          <MessageItem key={index} message={msg} />
        ))}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>AI が処理中です...</Text>
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
};
