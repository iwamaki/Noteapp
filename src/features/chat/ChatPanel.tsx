
import React, { useState, useRef, useCallback, useMemo } from 'react';
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
import APIService, { ChatContext } from '../../services/api';
import { ChatMessage, LLMCommand } from '../../services/llmService';

interface ChatPanelProps {
  context?: ChatContext;
  onCommandReceived?: (commands: LLMCommand[]) => void;
  isVisible: boolean;
  onClose: () => void;
}

// メッセージスタイルの型定義
interface MessageStyles {
  container: object;
  text: object;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  context = {},
  onCommandReceived,
  isVisible,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // メッセージスタイルのメモ化
  const messageStyles = useMemo((): Record<string, MessageStyles> => ({
    user: {
      container: [styles.message, styles.userMessage],
      text: [styles.messageText, styles.userMessageText],
    },
    ai: {
      container: [styles.message, styles.aiMessage],
      text: [styles.messageText, styles.aiMessageText],
    },
    system: {
      container: [styles.message, styles.systemMessage],
      text: [styles.messageText, styles.systemMessageText],
    },
  }), []);

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
    // 新しいメッセージが追加されたら一番下にスクロール
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const createMessage = useCallback(( 
    role: ChatMessage['role'],
    content: string
  ): ChatMessage => ({
    role,
    content,
    timestamp: new Date(),
  }), []);

  const handleLLMResponse = useCallback((response: any) => {
    // AI応答を追加
    const aiMessage = createMessage('ai', response.message || response.response || '');
    addMessage(aiMessage);

    // コマンドがある場合は親コンポーネントに通知
    if (response.commands && response.commands.length > 0 && onCommandReceived) {
      onCommandReceived(response.commands);
    }

    // 警告がある場合は表示
    if (response.warning) {
      const warningMessage = createMessage('system', `⚠️ ${response.warning}`);
      addMessage(warningMessage);
    }

    // プロバイダー情報を表示（デバッグ用）
    if (response.provider && response.model) {
      const debugMessage = createMessage(
        'system',
        `🔧 via ${response.provider} (${response.model}) | 履歴: ${response.historyCount || 0}件`
      );
      addMessage(debugMessage);
    }
  }, [createMessage, addMessage, onCommandReceived]);

  const handleError = useCallback((error: unknown) => {
    console.error('Chat error:', error);
    
    let errorMessageContent = '不明なエラーが発生しました。\n\nサーバーが起動していることを確認してください。';
    
    if (error instanceof Error) {
      errorMessageContent = `❌ エラーが発生しました: ${error.message}\n\nサーバーが起動していることを確認してください。`;
    }
    
    const errorMessage = createMessage('system', errorMessageContent);
    addMessage(errorMessage);
  }, [createMessage, addMessage]);

  const sendMessage = useCallback(async () => {
    const trimmedInput = inputText.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage = createMessage('user', trimmedInput);
    addMessage(userMessage);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await APIService.sendChatMessage(trimmedInput, context);
      handleLLMResponse(response);
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, context, createMessage, addMessage, handleLLMResponse, handleError]);

  const renderMessage = useCallback((message: ChatMessage, index: number) => {
    const styles = messageStyles[message.role];
    
    return (
      <View key={index} style={styles.container}>
        <Text style={styles.text}>{message.content}</Text>
        <Text style={messageTimestampStyle}>
          {message.timestamp.toLocaleTimeString()}
        </Text>
      </View>
    );
  }, [messageStyles]);

  const canSendMessage = useMemo(() => {
    return inputText.trim().length > 0 && !isLoading;
  }, [inputText, isLoading]);

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
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !canSendMessage && styles.disabledButton
            ]}
            onPress={sendMessage}
            disabled={!canSendMessage}
          >
            <Text style={[
              styles.sendButtonText,
              !canSendMessage && styles.disabledButtonText
            ]}>
              送信
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// メッセージタイムスタンプスタイル（定数として定義）
const messageTimestampStyle = {
  fontSize: 10,
  color: '#6c757d',
  marginTop: 4,
  textAlign: 'right' as const,
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
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
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