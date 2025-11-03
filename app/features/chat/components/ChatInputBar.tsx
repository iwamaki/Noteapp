/**
 * @file ChatInputBar.tsx
 * @summary このファイルは、アプリケーションのチャット入力バーコンポーネントを定義します。
 * @responsibility チャットUIの最上位コンポーネントとして、各サブコンポーネントを組み立て、
 * ChatUIContextを提供し、キーボード表示に応じたレイアウト調整を管理します。
 */

import React, { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useChat } from '../hooks/useChat';
import { useTheme } from '../../../design/theme/ThemeContext';
import { ChatHistory } from './ChatHistory';
import { ToggleTabButton } from './ToggleTabButton';
import { AttachedFilesList } from './AttachedFilesList';
import { MessageInput } from './MessageInput';
import { ChatUIProvider } from '../contexts/ChatUIContext';
import { useKeyboardAwareHeight } from '../hooks/useKeyboardAwareHeight';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardHeight } from '../../../contexts/KeyboardHeightContext';

export const ChatInputBar: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { keyboardHeight } = useKeyboardHeight();
  const {
    messages,
    isLoading,
    sendMessage,
    resetChat,
    chatAreaHeight,
    panResponder,
    isResizing,
    attachedFiles,
    removeAttachedFile,
    tokenUsage,
    summarizeConversation,
  } = useChat();

  // ローカルUI状態
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // キーボード対応の高さ追跡
  const { handleLayout } = useKeyboardAwareHeight({ isResizing });

  // ChatUIContextの値を準備
  const chatUIContextValue = useMemo(
    () => ({
      messages,
      isLoading,
      attachedFiles,
      tokenUsage,
      chatAreaHeight,
      panResponder,
      isResizing,
      sendMessage,
      resetChat,
      removeAttachedFile,
      summarizeConversation,
    }),
    [
      messages,
      isLoading,
      attachedFiles,
      tokenUsage,
      chatAreaHeight,
      panResponder,
      isResizing,
      sendMessage,
      resetChat,
      removeAttachedFile,
      summarizeConversation,
    ]
  );

  // 静的スタイルをメモ化
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          position: 'absolute',
          left: 0,
          right: 0,
          zIndex: 1,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.tertiary,
          paddingBottom: insets.bottom,
        },
      }),
    [colors, insets.bottom]
  );

  // 動的スタイルを分離
  const dynamicContainerStyle = useMemo(
    () => ({ bottom: keyboardHeight }),
    [keyboardHeight]
  );

  return (
    <ChatUIProvider value={chatUIContextValue}>
      <View style={[styles.container, dynamicContainerStyle]} onLayout={handleLayout}>
        {/* 付箋タブ型の展開ボタン */}
        {!isExpanded && (
          <ToggleTabButton
            onPress={() => setIsExpanded(true)}
            direction="up"
            position="top"
          />
        )}

        {/* メッセージ履歴エリア（展開可能） */}
        {isExpanded && (
          <ChatHistory
            messages={messages}
            isLoading={isLoading}
            onCollapse={() => setIsExpanded(false)}
            onResetChat={resetChat}
            onSummarize={summarizeConversation}
            messageAreaHeight={chatAreaHeight}
            panHandlers={panResponder.panHandlers}
            tokenUsage={tokenUsage}
          />
        )}

        {/* 添付ファイル表示 */}
        <AttachedFilesList />

        {/* 入力エリア（常に表示） */}
        <MessageInput inputText={inputText} setInputText={setInputText} />
      </View>
    </ChatUIProvider>
  );
};
