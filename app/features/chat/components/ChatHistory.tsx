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
import { ChatMessage } from '../../../services/llmService';
import { useTheme } from '../../../theme/ThemeContext';
import { MessageItem } from './MessageItem';

interface ChatHistoryProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onCollapse: () => void;
  messageAreaHeight: Animated.AnimatedValue;
  panHandlers: PanResponderInstance['panHandlers'];
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  messages,
  isLoading,
  onCollapse,
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
    messagesArea: {
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      overflow: 'hidden',
    },
    messagesHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.secondary,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    messagesHeaderTitle: {
      fontSize: typography.body.fontSize,
      fontWeight: '600',
      color: colors.text,
    },
    collapseButton: {
      padding: 4,
    },
    collapseButtonText: {
      fontSize: typography.subtitle.fontSize,
      color: colors.textSecondary,
    },
    messagesScrollView: {
      flex: 1,
    },
    messagesContent: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
    },
    loadingText: {
      marginLeft: 8,
      fontSize: typography.body.fontSize,
      color: colors.primary,
    },
  });

  return (
    <Animated.View style={[styles.messagesArea, { height: messageAreaHeight }]}>
      <View style={styles.messagesHeader} {...panHandlers}>
        <Text style={styles.messagesHeaderTitle}>チャット履歴</Text>
        <TouchableOpacity onPress={onCollapse} style={styles.collapseButton}>
          <Text style={styles.collapseButtonText}>▼</Text>
        </TouchableOpacity>
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
