/**
 * チャット入力バーコンポーネント
 * テキスト入力欄と送信ボタンを常に表示し、
 * メッセージ履歴は展開可能なエリアとして提供
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

interface ChatInputBarProps {
  context?: ChatContext;
  onCommandReceived?: (commands: LLMCommand[]) => void;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  context,
  onCommandReceived,
}) => {
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

  const handleSendMessage = async () => {
    const trimmedInput = inputText.trim();
    if (trimmedInput.length > 0 && !isLoading) {
      await sendMessage(trimmedInput);
      setInputText('');
    }
  };

  const canSendMessage = inputText.trim().length > 0 && !isLoading;

  const messageAreaHeight = expandAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 300],
  });

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
                <ActivityIndicator size="small" color="#007bff" />
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
          placeholderTextColor="#999"
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

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  messagesArea: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    overflow: 'hidden',
  },
  messagesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  messagesHeaderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  collapseButton: {
    padding: 4,
  },
  collapseButtonText: {
    fontSize: 16,
    color: '#6c757d',
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
    backgroundColor: '#007bff',
    alignSelf: 'flex-end',
  },
  aiMessage: {
    backgroundColor: '#f8f9fa',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  systemMessage: {
    backgroundColor: '#fff3cd',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  aiMessageText: {
    color: '#495057',
  },
  systemMessageText: {
    color: '#856404',
  },
  messageTimestamp: {
    fontSize: 10,
    color: '#6c757d',
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
    fontSize: 14,
    color: '#007bff',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 35,
    backgroundColor: '#f8f9fa',
  },
  expandButton: {
    alignSelf: 'flex-end',
    marginRight: 8,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
  },
  expandButtonText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '600',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    maxHeight: 100,
    marginRight: 8,
    minHeight: 40,
  },
  sendButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 40,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#6c757d',
    opacity: 0.5,
  },
  disabledButtonText: {
    opacity: 0.7,
  },
});
