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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ChatMessage, TokenUsageInfo } from '../llmService/index';
import { useTheme } from '../../../design/theme/ThemeContext';
import { MessageItem } from './MessageItem';
import { ToggleTabButton } from './ToggleTabButton';
import { getTokenUsageBarColor } from '../utils/tokenUsageHelpers';

interface ChatHistoryProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onCollapse: () => void;
  onResetChat: () => void;
  onSummarize: () => void;
  messageAreaHeight: Animated.AnimatedValue;
  panHandlers: PanResponderInstance['panHandlers'];
  tokenUsage: TokenUsageInfo | null;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  messages,
  isLoading,
  onCollapse,
  onResetChat,
  onSummarize,
  messageAreaHeight,
  panHandlers,
  tokenUsage,
}) => {
  const { colors, typography, iconSizes } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);

  // 要約ボタンを有効にする条件: トークン使用量が75%超
  const canSummarize = tokenUsage ? tokenUsage.usageRatio > 0.75 : false;

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // トークン使用量インジケーターのレンダリング
  const renderTokenUsageIndicator = () => {
    // tokenUsageがnullまたはundefinedの場合は常に表示（0%として）
    const percentage = tokenUsage ? tokenUsage.usageRatio * 100 : 0;
    const barColor = tokenUsage ? getTokenUsageBarColor(tokenUsage, colors) : colors.border;

    return (
      <View style={styles.tokenUsageContainer}>
        <View style={styles.tokenUsageBar}>
          <View
            style={[
              styles.tokenUsageProgress,
              {
                width: `${Math.min(percentage, 100)}%`,
                backgroundColor: barColor
              }
            ]}
          />
        </View>
      </View>
    );
  };

  const styles = StyleSheet.create({
    resetButton: {
      paddingHorizontal: 0,
      paddingVertical: 8,
      minWidth: 38,
      justifyContent: 'center',
      alignItems: 'center',
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
    },
    messagesContent: {
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    messagesHeader: {
      position: 'relative', // 付箋タブボタンのabsolute配置の基準
      alignItems: 'center',
      backgroundColor: colors.background,
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingLeft: 12,
      paddingRight: 8,
      paddingVertical: 8,
    },
    messagesHeaderTitle: {
      color: colors.text,
      fontSize: typography.category.fontSize,
      fontWeight: '600',
    },

    headerButtonContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },

    messagesScrollView: {
      flex: 1,
    },

    // トークン使用量インジケーターのスタイル
    tokenUsageContainer: {
      paddingHorizontal: 0,
      paddingTop: 0,
      paddingBottom: 0,
    },
    tokenUsageBar: {
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      overflow: 'hidden',
      marginBottom: 0,
    },
    tokenUsageProgress: {
      height: '100%',
      borderRadius: 2,
    },
    tokenUsageInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    tokenUsageText: {
      fontSize: 10,
      color: colors.textSecondary,
    },
    summaryWarning: {
      fontSize: 10,
      color: colors.danger,
      fontWeight: '600',
    },
  });

  return (
    <Animated.View style={[styles.messagesArea, { height: messageAreaHeight }]}>
      <View style={styles.messagesHeader} {...panHandlers}>
        {/* 付箋タブ型の折りたたみボタン（ヘッダーの中央上端） */}
        <ToggleTabButton
          onPress={onCollapse}
          direction="down"
          position="top"
        />

        <Text style={styles.messagesHeaderTitle}>チャット履歴</Text>
        <View style={styles.headerButtonContainer}>
          <TouchableOpacity
            onPress={onSummarize}
            style={styles.resetButton}
            disabled={!canSummarize}
          >
            <MaterialCommunityIcons
              name="brain"
              size={iconSizes.medium}
              color={canSummarize ? colors.text : colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={onResetChat} style={styles.resetButton}>
            <Ionicons
              name="reload"
              size={iconSizes.medium}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* トークン使用量インジケーター */}
      {renderTokenUsageIndicator()}

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesScrollView}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((msg, index) => (
          <MessageItem
            key={index}
            message={msg}
            tokenUsage={tokenUsage}
            isLoading={isLoading}
          />
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
