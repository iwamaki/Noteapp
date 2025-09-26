/**
 * チャット機能コンポーネント
 * プロトタイプのmessage-processor.jsのチャット機能をReact Nativeコンポーネントに変換
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ChatMessage, LLMService, ChatContext } from '../../services/llmService';

interface ChatComponentProps {
  context?: ChatContext;
  onCommandReceived?: (commands: any[]) => void;
  isVisible: boolean;
  onClose: () => void;
}

export const ChatComponent: React.FC<ChatComponentProps> = ({
  context = {},
  onCommandReceived,
  isVisible,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
    // 新しいメッセージが追加されたら一番下にスクロール
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await LLMService.sendChatMessage(inputText.trim(), context);

      // AI応答を追加
      const aiMessage: ChatMessage = {
        role: 'ai',
        content: response.message || response.response || '',
        timestamp: new Date(),
      };
      addMessage(aiMessage);

      // コマンドがある場合は親コンポーネントに通知
      if (response.commands && response.commands.length > 0 && onCommandReceived) {
        onCommandReceived(response.commands);
      }

      // 警告がある場合は表示
      if (response.warning) {
        const warningMessage: ChatMessage = {
          role: 'system',
          content: `⚠️ ${response.warning}`,
          timestamp: new Date(),
        };
        addMessage(warningMessage);
      }

      // プロバイダー情報を表示（デバッグ用）
      if (response.provider && response.model) {
        const debugMessage: ChatMessage = {
          role: 'system',
          content: `🔧 via ${response.provider} (${response.model}) | 履歴: ${response.historyCount || 0}件`,
          timestamp: new Date(),
        };
        addMessage(debugMessage);
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        role: 'system',
        content: `❌ エラーが発生しました: ${error.message}\n\nサーバーが起動していることを確認してください。`,
        timestamp: new Date(),
      };
      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, context, onCommandReceived, addMessage]);

  const renderMessage = useCallback((message: ChatMessage, index: number) => {
    let messageStyle = styles.message;
    let textStyle = styles.messageText;

    switch (message.role) {
      case 'user':
        messageStyle = [styles.message, styles.userMessage];
        textStyle = [styles.messageText, styles.userMessageText];
        break;
      case 'ai':
        messageStyle = [styles.message, styles.aiMessage];
        textStyle = [styles.messageText, styles.aiMessageText];
        break;
      case 'system':
        messageStyle = [styles.message, styles.systemMessage];
        textStyle = [styles.messageText, styles.systemMessageText];
        break;
    }

    return (
      <View key={index} style={messageStyle}>
        <Text style={textStyle}>{message.content}</Text>
        <Text style={styles.timestamp}>
          {message.timestamp.toLocaleTimeString()}
        </Text>
      </View>
    );
  }, []);

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI チャット</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* メッセージ一覧 */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
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

        {/* 入力欄 */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="メッセージを入力してください..."
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.disabledButton]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <Text style={[styles.sendButtonText, (!inputText.trim() || isLoading) && styles.disabledButtonText]}>
              送信
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    height: '70%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#495057',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6c757d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  timestamp: {
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
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#fff',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
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