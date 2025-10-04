/**
 * @file ChatInputBar.tsx
 * @summary このファイルは、アプリケーションのチャット入力バーコンポーネントを定義します。
 * @responsibility ユーザーがメッセージを入力して送信するためのUIを提供し、チャット履歴の表示と管理、およびキーボードの表示状態に応じたレイアウト調整を行う責任があります。
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  Platform,
  Animated,
  Keyboard,
  KeyboardEvent,
} from 'react-native';
import { LLMCommand } from '../../services/llmService';
import { useChat } from './hooks/useChat';
import { ChatContext } from '../../services/api';
import { useTheme } from '../../theme/ThemeContext';
import { ChatHistory } from './components/ChatHistory';

// チャット入力バーコンポーネントのプロパティ
interface ChatInputBarProps {
  context?: ChatContext;
  onCommandReceived?: (commands: LLMCommand[]) => void;
}

// チャット入力バーコンポーネント
export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  context,
  onCommandReceived,
}) => {
  const { colors, typography } = useTheme();
  const {
    messages,
    isLoading,
    sendMessage,
    chatAreaHeight,
    panResponder,
  } = useChat(context, onCommandReceived);
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const positionAnimation = useRef(new Animated.Value(0)).current;

  // キーボードイベントのリスナー
  useEffect(() => {
    const keyboardWillShow = (e: KeyboardEvent) => {
      const height = e.endCoordinates.height;
      setKeyboardHeight(height);
      Animated.timing(positionAnimation, {
        toValue: height,
        duration: e.duration || 250,
        useNativeDriver: false,
      }).start();
    };

    // キーボードが隠れたときの処理
    const keyboardWillHide = (e: KeyboardEvent) => {
      setKeyboardHeight(0);
      Animated.timing(positionAnimation, {
        toValue: 0,
        duration: e.duration || 250,
        useNativeDriver: false,
      }).start();
    };

    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, keyboardWillShow);
    const hideSubscription = Keyboard.addListener(hideEvent, keyboardWillHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

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
      bottom: 0,
      backgroundColor: colors.secondary,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      zIndex: 999,
    },
    inputArea: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 10,
      paddingVertical: 8,
      paddingBottom: Platform.OS === 'ios' ? 20 : 35,
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
    textInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 15,
      paddingVertical: 10,
      fontSize: typography.subtitle.fontSize,
      backgroundColor: colors.background,
      color: colors.text,
      maxHeight: 100,
      marginRight: 8,
      minHeight: 40,
    },
    sendButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 40,
    },
    sendButtonText: {
      color: '#fff',
      fontSize: typography.subtitle.fontSize,
      fontWeight: '600',
    },
    disabledButton: {
      backgroundColor: colors.textSecondary,
      opacity: 0.5,
    },
    disabledButtonText: {
      opacity: 0.7,
    },
  });

  return (
    <Animated.View style={[styles.container, { bottom: positionAnimation }]}>
      {/* メッセージ履歴エリア（展開可能） */}
      {isExpanded && (
        <ChatHistory
          messages={messages}
          isLoading={isLoading}
          onCollapse={() => setIsExpanded(false)}
          messageAreaHeight={chatAreaHeight}
          panHandlers={panResponder.panHandlers}
        />
      )}

      {/* 入力エリア（常に表示） */}
      <View style={styles.inputArea}>
        {!isExpanded && messages.length > 0 && (
          <TouchableOpacity
            onPress={() => setIsExpanded(true)}
            style={styles.expandButton}
          >
            <Text style={styles.expandButtonText}>▲ {messages.length}</Text>
          </TouchableOpacity>
        )}
        <TextInput
          style={styles.textInput}
          placeholder="メッセージを入力..."
          placeholderTextColor={colors.textSecondary}
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
          <Text
            style={[
              styles.sendButtonText,
              !canSendMessage && styles.disabledButtonText,
            ]}
          >
            送信
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};