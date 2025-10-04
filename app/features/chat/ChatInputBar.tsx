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
  ScrollView,
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardEvent,
} from 'react-native';
import { ChatMessage, LLMCommand } from '../../services/llmService';
import { useChat } from './hooks/useChat';
import { ChatContext } from '../../services/api';
import { useTheme } from '../../theme/ThemeContext';

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
  const { colors, spacing, typography } = useTheme();
  const { messages, isLoading, sendMessage } = useChat(context, onCommandReceived);
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const expandAnimation = useRef(new Animated.Value(0)).current;
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

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, keyboardWillShow);
    const hideSubscription = Keyboard.addListener(hideEvent, keyboardWillHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // メッセージが追加されたら自動スクロール
  useEffect(() => {
    if (isExpanded && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isExpanded]);

  
  // 展開/折りたたみアニメーション
  useEffect(() => {
    Animated.timing(expandAnimation, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isExpanded]);  

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

  // アニメーションで変化するスタイル
  const messageAreaHeight = expandAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 300],
  });

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.secondary,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
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
    messageTimestamp: {
      fontSize: typography.caption.fontSize,
      color: colors.textSecondary,
      marginTop: 4,
      textAlign: 'right',
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

  // メッセージのレンダリング
  const renderMessage = (message: ChatMessage, index: number) => {
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
      <View key={index} style={containerStyle}>
        <Text style={textStyle}>{message.content}</Text>
        <Text style={styles.messageTimestamp}>
          {message.timestamp.toLocaleTimeString()}
        </Text>
      </View>
    );
  };

  return (
    <Animated.View style={[styles.container, { bottom: positionAnimation }]}>
      {/* メッセージ履歴エリア（展開可能） */}
      {isExpanded && (
        <Animated.View style={[styles.messagesArea, { height: messageAreaHeight }]}>
          <View style={styles.messagesHeader}>
            <Text style={styles.messagesHeaderTitle}>チャット履歴</Text>
            <TouchableOpacity
              onPress={() => setIsExpanded(false)}
              style={styles.collapseButton}
            >
              <Text style={styles.collapseButtonText}>▼</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesScrollView}
            contentContainerStyle={styles.messagesContent}
          >
            {messages.map(renderMessage)}
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>AI が処理中です...</Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
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
