
import { useState, useCallback, useMemo } from 'react';
import APIService, { ChatContext } from '../../../services/api';
import { ChatMessage, LLMCommand } from '../../../services/llmService';

export const useChat = (context: ChatContext = {}, onCommandReceived?: (commands: LLMCommand[]) => void) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const createMessage = useCallback(( 
    role: ChatMessage['role'],
    content: string
  ): ChatMessage => ({
    role,
    content,
    timestamp: new Date(),
  }), []);

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const handleLLMResponse = useCallback((response: any) => {
    const aiMessage = createMessage('ai', response.message || response.response || '');
    addMessage(aiMessage);

    if (response.commands && response.commands.length > 0 && onCommandReceived) {
      onCommandReceived(response.commands);
    }

    if (response.warning) {
      const warningMessage = createMessage('system', `⚠️ ${response.warning}`);
      addMessage(warningMessage);
    }

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

  const sendMessage = useCallback(async (inputText: string) => {
    const trimmedInput = inputText.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage = createMessage('user', trimmedInput);
    addMessage(userMessage);
    setIsLoading(true);

    try {
      const response = await APIService.sendChatMessage(trimmedInput, context);
      handleLLMResponse(response);
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, context, createMessage, addMessage, handleLLMResponse, handleError]);

  return {
    messages,
    isLoading,
    sendMessage,
  };
};
