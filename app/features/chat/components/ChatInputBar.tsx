/**
 * @file ChatInputBar.tsx
 * @summary このファイルは、アプリケーションのチャット入力バーコンポーネントを定義します。
 * @responsibility チャットUIの最上位コンポーネントとして、各サブコンポーネントを組み立て、
 * キーボード表示に応じたレイアウト調整を管理します。
 */

import React, { useState, useMemo } from 'react';
import { View } from 'react-native';
import { useChat } from '../hooks/useChat';
import { useTheme } from '../../../design/theme/ThemeContext';
import { ChatHistory } from './ChatHistory';
import { ToggleTabButton } from './ToggleTabButton';
import { AttachedFilesList } from './AttachedFilesList';
import { MessageInput } from './MessageInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const ChatInputBar: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const {
    messages,
    isLoading,
    resetChat,
    chatAreaHeight,
    panResponder,
    tokenUsage,
    summarizeConversation,
    onResizeCompleteRef,
  } = useChat();

  // ローカルUI状態
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // 動的スタイルをメモ化
  const containerStyle = useMemo(
    () => ({
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.tertiary,
      paddingBottom: insets.bottom,
    }),
    [colors, insets.bottom]
  );

  return (
    <View style={containerStyle}>
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
          onResizeCompleteRef={onResizeCompleteRef}
        />
      )}

      {/* 添付ファイル表示 */}
      <AttachedFilesList />

      {/* 入力エリア（常に表示） */}
      <MessageInput inputText={inputText} setInputText={setInputText} />
    </View>
  );
};
