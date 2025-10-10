/**
 * @file useChat.ts
 * @summary このファイルは、チャット機能のロジックをカプセル化するカスタムフックを定義します。
 * @responsibility チャットメッセージの送受信、状態管理（メッセージ履歴、ローディング状態）、およびLLMからの応答処理（コマンドの実行を含む）を担当します。
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Animated, PanResponder } from 'react-native';
import APIService, { ChatContext } from '../../../services/llmService/api';
import { ChatMessage, LLMCommand } from '../../../services/llmService/index';
import { logger } from '../../../utils/logger';
import { useSettingsStore } from '../../../settings/settingsStore';


// チャットエリアの高さの制限値
const CHAT_AREA_MIN_HEIGHT = 150;       // 最小高さ
const CHAT_AREA_MAX_HEIGHT = 400;       // 最大高さ
const CHAT_AREA_INITIAL_HEIGHT = 250;   // 初期高さ


export const useChat = (
  context: ChatContext = {},
  onCommandReceived?: (commands: LLMCommand[]) => void,
  currentNoteTitle?: string,
  currentNoteContent?: string
) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);
  const { settings } = useSettingsStore();

  const chatAreaHeight = useRef(new Animated.Value(CHAT_AREA_INITIAL_HEIGHT)).current;
  const heightValue = useRef(CHAT_AREA_INITIAL_HEIGHT);

  useEffect(() => {
    const listenerId = chatAreaHeight.addListener(({ value }) => {
      heightValue.current = value;
    });
    return () => {
      chatAreaHeight.removeListener(listenerId);
    };
  }, [chatAreaHeight]);

  const gestureStartHeight = useRef(0);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        gestureStartHeight.current = heightValue.current;
      },
      onPanResponderMove: (_, gestureState) => {
        const newHeight = gestureStartHeight.current - gestureState.dy;

        let clampedHeight = newHeight;
        if (clampedHeight < CHAT_AREA_MIN_HEIGHT) {
          clampedHeight = CHAT_AREA_MIN_HEIGHT;
        } else if (clampedHeight > CHAT_AREA_MAX_HEIGHT) {
          clampedHeight = CHAT_AREA_MAX_HEIGHT;
        }

        chatAreaHeight.setValue(clampedHeight);
      },
      onPanResponderRelease: () => {
        // onPanResponderMoveで値がすでに設定されているため、何もしません
      },
    })
  ).current;

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
    logger.debug('chat', 'sendMessage called with:', { inputText });
    logger.debug('chat', 'Current note state:', { currentNoteTitle, currentNoteContent });
    const trimmedInput = inputText.trim();
    if (!trimmedInput || isLoadingRef.current) {
      logger.debug('chat', 'sendMessage aborted (empty input or loading)');
      return;
    }

    const userMessage = createMessage('user', trimmedInput);
    addMessage(userMessage);
    isLoadingRef.current = true;
    setIsLoading(true);

    try {
      // 設定からLLMプロバイダーとモデルを適用
      APIService.setLLMProvider(settings.llmProvider);
      APIService.setLLMModel(settings.llmModel);

      // コンテキストを動的に構築
      const dynamicContext = { ...context };

      logger.debug('llm', 'Sending message to API with context:', dynamicContext);
      logger.debug('llm', 'Using provider:', settings.llmProvider, 'model:', settings.llmModel);
      const response = await APIService.sendChatMessage(trimmedInput, dynamicContext);

      // レスポンスを処理
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
    } catch (error) {
      handleError(error);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
      logger.debug('chat', '==========sendMessage finished==========');
    }
  }, [context, currentNoteTitle, currentNoteContent, createMessage, addMessage, handleError, onCommandReceived, settings.llmProvider, settings.llmModel]);

  return {
    messages,
    isLoading,
    sendMessage,
    chatAreaHeight,
    panResponder,
  };
};
