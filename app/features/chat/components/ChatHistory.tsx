import React, { useRef, useEffect, useState, useCallback, useMemo, MutableRefObject } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  PanResponderInstance,
  ListRenderItem,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ChatMessage, TokenUsageInfo } from '../../llmService/index';
import { useTheme } from '../../../design/theme/ThemeContext';
import { MessageItem } from './MessageItem';
import { ToggleTabButton } from './ToggleTabButton';
import { getTokenUsageBarColor } from '../../llmService/utils/tokenUsageHelpers';
import { ModelSelectionModal } from './ModelSelectionModal';

interface ChatHistoryProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onCollapse: () => void;
  onResetChat: () => void;
  onSummarize: () => void;
  messageAreaHeight: number;
  panHandlers: PanResponderInstance['panHandlers'];
  tokenUsage: TokenUsageInfo | null;
  onResizeCompleteRef: MutableRefObject<(() => void) | null>;
}

const ChatHistoryComponent: React.FC<ChatHistoryProps> = ({
  messages,
  isLoading,
  onCollapse,
  onResetChat,
  onSummarize,
  messageAreaHeight,
  panHandlers,
  tokenUsage,
  onResizeCompleteRef,
}) => {
  const { t } = useTranslation();
  const { colors, typography, iconSizes } = useTheme();
  const flatListRef = useRef<FlatList>(null);
  const [modelSelectionModalVisible, setModelSelectionModalVisible] = useState(false);

  // 要約ボタンを有効にする条件: トークン使用量が50%超
  const canSummarize = tokenUsage ? tokenUsage.usageRatio > 0.5 : false;

  // リサイズ完了時のスクロール処理を設定
  useEffect(() => {
    onResizeCompleteRef.current = () => {
      if (messages.length > 0) {
        flatListRef.current?.scrollToEnd({ animated: true });
      }
    };
  }, [messages, onResizeCompleteRef]);

  // 新しいメッセージが追加されたときのスクロール処理
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const renderMessage: ListRenderItem<ChatMessage> = useCallback(
    ({ item }) => (
      <MessageItem
        message={item}
        tokenUsage={tokenUsage}
        isLoading={isLoading}
      />
    ),
    [tokenUsage, isLoading]
  );

  const keyExtractor = useCallback(
    (item: ChatMessage, index: number) => `message-${index}`,
    []
  );

  // トークン使用量インジケーターのレンダリング
  const tokenUsageBarColor = useMemo(
    () => (tokenUsage ? getTokenUsageBarColor(tokenUsage, colors) : colors.border),
    [tokenUsage, colors]
  );

  const tokenUsagePercentage = useMemo(
    () => (tokenUsage ? tokenUsage.usageRatio * 100 : 0),
    [tokenUsage]
  );

  const styles = useMemo(
    () => ({
      resetButton: {
        paddingHorizontal: 0,
        paddingVertical: 8,
        minWidth: 38,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
      },

      loadingContainer: {
        alignItems: 'center' as const,
        flexDirection: 'row' as const,
        justifyContent: 'center' as const,
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
        position: 'relative' as const,
        alignItems: 'center' as const,
        backgroundColor: colors.background,
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        paddingLeft: 12,
        paddingRight: 8,
        paddingVertical: 8,
      },
      messagesHeaderTitle: {
        color: colors.text,
        fontSize: typography.category.fontSize,
        fontWeight: '600' as const,
      },

      headerButtonContainer: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 4,
      },

      messagesScrollView: {
        flex: 1,
      },

      tokenUsageContainer: {
        paddingHorizontal: 0,
        paddingTop: 0,
        paddingBottom: 0,
      },
      tokenUsageBar: {
        height: 4,
        backgroundColor: colors.border,
        borderRadius: 2,
        overflow: 'hidden' as const,
        marginBottom: 0,
      },
      tokenUsageProgress: {
        height: '100%' as const,
        borderRadius: 2,
      },
    }),
    [colors, typography]
  );

  return (
    <View style={[styles.messagesArea, { height: messageAreaHeight }]}>
      <View style={styles.messagesHeader} {...panHandlers}>
        {/* 付箋タブ型の折りたたみボタン（ヘッダーの中央上端） */}
        <ToggleTabButton
          onPress={onCollapse}
          direction="down"
          position="top"
        />

        <Text style={styles.messagesHeaderTitle}>{t('chat.history.title')}</Text>
        <View style={styles.headerButtonContainer}>
          <TouchableOpacity
            onPress={() => setModelSelectionModalVisible(true)}
            style={styles.resetButton}
          >
            <Ionicons
              name="apps-outline"
              size={iconSizes.medium}
              color={colors.text}
            />
          </TouchableOpacity>
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
      <View style={styles.tokenUsageContainer}>
        <View style={styles.tokenUsageBar}>
          <View
            style={[
              styles.tokenUsageProgress,
              {
                width: `${Math.min(tokenUsagePercentage, 100)}%`,
                backgroundColor: tokenUsageBarColor
              }
            ]}
          />
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        style={styles.messagesScrollView}
        contentContainerStyle={styles.messagesContent}
        ListFooterComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>{t('chat.history.loading')}</Text>
            </View>
          ) : null
        }
        onContentSizeChange={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }}
      />

      {/* ModelSelectionModal */}
      <ModelSelectionModal
        isVisible={modelSelectionModalVisible}
        onClose={() => setModelSelectionModalVisible(false)}
      />
    </View>
  );
};

export const ChatHistory = React.memo(ChatHistoryComponent);
ChatHistory.displayName = 'ChatHistory';
