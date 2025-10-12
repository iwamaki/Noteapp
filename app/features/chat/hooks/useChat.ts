/**
 * @file useChat.ts
 * @summary このファイルは、チャット機能のロジックをカプセル化するカスタムフックを定義します。
 * @responsibility ChatServiceと連携し、チャットメッセージの送受信、状態管理（メッセージ履歴、ローディング状態）を担当します。
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Animated, PanResponder } from 'react-native';
import { ChatMessage } from '../../../services/llmService/index';
import { logger } from '../../../utils/logger';
import { useSettingsStore } from '../../../settings/settingsStore';
import ChatService from '../index';

// チャットエリアの高さの制限値
const CHAT_AREA_MIN_HEIGHT = 150;       // 最小高さ
const CHAT_AREA_MAX_HEIGHT = 400;       // 最大高さ
const CHAT_AREA_INITIAL_HEIGHT = 250;   // 初期高さ

/**
 * チャット機能のカスタムフック
 *
 * このフックは、ChatServiceと連携してチャット機能を提供します。
 */
export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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

  // ChatServiceからLLM設定を更新
  useEffect(() => {
    ChatService.setLLMConfig(settings.llmProvider, settings.llmModel);
  }, [settings.llmProvider, settings.llmModel]);

  // ChatServiceのリスナーを登録
  useEffect(() => {
    const listenerId = 'useChat';

    logger.debug('chat', '[useChat] Subscribing to ChatService');

    // 初期状態を取得
    setMessages(ChatService.getMessages());
    setIsLoading(ChatService.getIsLoading());

    // リスナーを登録
    ChatService.subscribe(listenerId, {
      onMessagesUpdate: (newMessages) => {
        logger.debug('chat', '[useChat] Messages updated', { count: newMessages.length });
        setMessages(newMessages);
      },
      onLoadingChange: (loading) => {
        logger.debug('chat', '[useChat] Loading state changed', { loading });
        setIsLoading(loading);
      },
    });

    // クリーンアップ
    return () => {
      logger.debug('chat', '[useChat] Unsubscribing from ChatService');
      ChatService.unsubscribe(listenerId);
    };
  }, []);

  const sendMessage = useCallback(async (inputText: string) => {
    logger.debug('chat', '[useChat] sendMessage called with:', { inputText });
    await ChatService.sendMessage(inputText);
  }, []);

  const resetChat = useCallback(() => {
    logger.debug('chat', '[useChat] resetChat called');
    ChatService.resetChat();
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    resetChat,
    chatAreaHeight,
    panResponder,
  };
};
