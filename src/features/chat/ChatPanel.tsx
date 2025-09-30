/**
 *  AIチャットパネル
 *  ユーザーとAIの対話を表示し、メッセージの送受信を管理するコンポーネントです。
 */

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ChatContext } from '../../services/api';
import { LLMCommand, ChatMessage } from '../../services/llmService';
import { useChat } from './hooks/useChat';

interface ChatPanelProps {
  context?: ChatContext;
  onCommandReceived?: (commands: LLMCommand[]) => void;
  isVisible: boolean;
  onClose: () => void;
}

interface MessageStyles {
  container: object;
  text: object;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ context, onCommandReceived, isVisible, onClose }) => {
  const { messages, isLoading, sendMessage } = useChat(context, onCommandReceived);
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (isVisible) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isVisible]);

  const handleSendMessage = async () => {
    if (inputText.trim().length > 0 && !isLoading) {
      await sendMessage(inputText);
      setInputText('');
    }
  };

  const messageStyles = useMemo((): Record<string, MessageStyles> => ({
    user: { container: [styles.message, styles.userMessage], text: [styles.messageText, styles.userMessageText] },
    ai: { container: [styles.message, styles.aiMessage], text: [styles.messageText, styles.aiMessageText] },
    system: { container: [styles.message, styles.systemMessage], text: [styles.messageText, styles.systemMessageText] },
  }), []);

  const renderMessage = useCallback((message: ChatMessage, index: number) => {
    const styles = messageStyles[message.role];
    return (
      <View key={index} style={styles.container}>
        <Text style={styles.text}>{message.content}</Text>
        <Text style={messageTimestampStyle}>{message.timestamp.toLocaleTimeString()}</Text>
      </View>
    );
  }, [messageStyles]);

  const canSendMessage = useMemo(() => inputText.trim().length > 0 && !isLoading, [inputText, isLoading]);

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI チャット</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView ref={scrollViewRef} style={styles.messagesContainer} contentContainerStyle={styles.messagesContent}>
          {messages.map(renderMessage)}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#007bff" />
              <Text style={styles.loadingText}>AI が処理中です...</Text>
            </View>
          )}
        </ScrollView>

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
            onSubmitEditing={handleSendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, !canSendMessage && styles.disabledButton]}
            onPress={handleSendMessage}
            disabled={!canSendMessage}
          >
            <Text style={[styles.sendButtonText, !canSendMessage && styles.disabledButtonText]}>送信</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

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