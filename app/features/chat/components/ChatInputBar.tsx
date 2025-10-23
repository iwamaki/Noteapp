/**
 * @file ChatInputBar.tsx
 * @summary このファイルは、アプリケーションのチャット入力バーコンポーネントを定義します。
 * @responsibility ユーザーがメッセージを入力して送信するためのUIを提供し、チャット履歴の表示と管理、
 * およびキーボードの表示状態に応じたレイアウト調整を全て自己管理する責任があります。
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
} from 'react-native';
import { CustomInlineInput } from '../../../components/CustomInlineInput';
import { Ionicons } from '@expo/vector-icons';
import { useChat } from '../hooks/useChat';
import { useTheme } from '../../../design/theme/ThemeContext';
import { ChatHistory } from '../components/ChatHistory';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardHeight } from '../../../contexts/KeyboardHeightContext';

export const ChatInputBar: React.FC = () => {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { keyboardHeight, setChatInputBarHeight } = useKeyboardHeight();
  const {
    messages,
    isLoading,
    sendMessage,
    resetChat,
    chatAreaHeight,
    panResponder,
    isResizing,
  } = useChat();
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const lastHeightRef = useRef<number>(0);

  // ChatInputBarの高さを計測してContextに報告
  const handleLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    lastHeightRef.current = height;
    // スワイプ中はレイアウト更新を抑制
    if (!isResizing) {
      setChatInputBarHeight(height);
    }
  };

  // スワイプ終了時にレイアウトを更新
  useEffect(() => {
    if (!isResizing && lastHeightRef.current > 0) {
      setChatInputBarHeight(lastHeightRef.current);
    }
  }, [isResizing, setChatInputBarHeight]);

  // メッセージ送信処理
  const handleSendMessage = async () => {
    const trimmedInput = inputText.trim();
    if (trimmedInput.length > 0 && !isLoading) {
  
      await sendMessage(trimmedInput);
      setInputText('');
    }
  };

  // 送信可能かどうかの判定
  const canSendMessage = inputText.trim().length > 0 && !isLoading;

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 1,
      backgroundColor: colors.secondary,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingBottom: insets.bottom,
    },
    inputArea: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingTop: 10,
      paddingBottom: 10,
      backgroundColor: colors.secondary,
    },
    expandButton: {
      alignSelf: 'flex-end',
      marginRight: 8,
      marginBottom: 8,
      paddingHorizontal: 8,
      paddingVertical: 6,
      backgroundColor: colors.border,
      borderRadius: 4,
    },
    expandButtonText: {
      fontSize: typography.caption.fontSize,
      color: colors.text,
      fontWeight: '600',
    },
    customInput: {
      flex: 1,
      maxHeight: 100,
      marginRight: 10,
      minHeight: 44,
    },
    sendButton: {
      justifyContent: 'center',
      alignItems: 'center',
      // Removed: backgroundColor, padding, borderRadius, minHeight
    },
    disabledButton: {
      opacity: 0.5,
    },
    disabledButtonText: {
      opacity: 0.7,
    },
  });

  return (
    <View style={[styles.container, { bottom: keyboardHeight }]} onLayout={handleLayout}>
        {/* メッセージ履歴エリア（展開可能） */}
        {isExpanded && (
          <ChatHistory
            messages={messages}
            isLoading={isLoading}
            onCollapse={() => setIsExpanded(false)}
            onResetChat={resetChat} // 追加
            messageAreaHeight={chatAreaHeight}
            panHandlers={panResponder.panHandlers}
          />
        )}

        {/* 入力エリア（常に表示） */}
        <View style={styles.inputArea}>
          {!isExpanded && (
            <TouchableOpacity
              onPress={() => setIsExpanded(true)}
              style={styles.expandButton}
            >
              <Text style={styles.expandButtonText}>▲ {messages.filter(msg => msg.role === 'user').length}</Text>
            </TouchableOpacity>
          )}
          <CustomInlineInput
            style={styles.customInput}
            placeholder="メッセージを入力..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
            editable={!isLoading}
            onSubmitEditing={handleSendMessage}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendButton, !canSendMessage && styles.disabledButton]}
            onPress={handleSendMessage}
            disabled={!canSendMessage}
          >
            <Ionicons
              name="send"
              size={30}
              color={colors.primary}
              style={!canSendMessage && styles.disabledButtonText}
            />
          </TouchableOpacity>
        </View>
    </View>
  );
};
