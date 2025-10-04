/**
 * @file useChat.ts
 * @summary このファイルは、チャット機能のロジックをカプセル化するカスタムフックを定義します。
 * @responsibility チャットメッセージの送受信、状態管理（メッセージ履歴、ローディング状態）、およびLLMからの応答処理（コマンドの実行を含む）を担当します。
 */

import { useState, useCallback } from 'react';
import APIService, { ChatContext } from '../../../services/api';
import { ChatMessage, LLMCommand } from '../../../services/llmService';
import { logger } from '../../../utils/logger';

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
    logger.debug('chat', 'Adding message:', message);
    setMessages(prev => [...prev, message]);
  }, []);

  const handleLLMResponse = useCallback((response: any) => {
    logger.debug('llm', 'Handling LLM response:', response);
    const aiMessage = createMessage('ai', response.message || '');
    addMessage(aiMessage);

    if (response.commands && response.commands.length > 0 && onCommandReceived) {
      logger.debug('llm', 'Commands received from LLM:', response.commands);
      onCommandReceived(response.commands);
    }

    if (response.warning) {
      const warningMessage = createMessage('system', `⚠️ ${response.warning}`);
      addMessage(warningMessage);
    }
  }, [createMessage, addMessage, onCommandReceived]);

  const handleError = useCallback((error: unknown) => {
    logger.debug('chat', 'Handling error:', error);
    console.error('Chat error:', error);
    
    let errorMessageContent = '不明なエラーが発生しました。\n\nサーバーが起動していることを確認してください。';
    
    if (error instanceof Error) {
      errorMessageContent = `❌ エラーが発生しました: ${error.message}\n\nサーバーが起動していることを確認してください。`;
    }
    
    const errorMessage = createMessage('system', errorMessageContent);
    addMessage(errorMessage);
  }, [createMessage, addMessage]);

  const sendMessage = useCallback(async (inputText: string) => {
    logger.debug('chat', 'sendMessage called with:', inputText);
    const trimmedInput = inputText.trim();
    if (!trimmedInput || isLoading) {
      logger.debug('chat', 'sendMessage aborted (empty input or loading)');
      return;
    }

    const userMessage = createMessage('user', trimmedInput);
    addMessage(userMessage);
    setIsLoading(true);

    try {
      logger.debug('llm', 'Sending message to API with context:', context);
      const response = await APIService.sendChatMessage(trimmedInput, context);
      handleLLMResponse(response);
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
      logger.debug('chat', '==========sendMessage finished==========');
    }
  }, [isLoading, context, createMessage, addMessage, handleLLMResponse, handleError]);

  return {
    messages,
    isLoading,
    sendMessage,
  };
};
