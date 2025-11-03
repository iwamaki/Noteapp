/**
 * @file useChat.ts
 * @summary このファイルは、チャット機能のロジックをカプセル化するカスタムフックを定義します。
 * @responsibility ChatServiceと連携し、チャットメッセージの送受信、状態管理（メッセージ履歴、ローディング状態）を担当します。
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Animated, PanResponder } from 'react-native';
import { logger } from '../../../utils/logger';
import { useSettingsStore } from '../../../settings/settingsStore';
import ChatService from '../index';
import { CHAT_CONFIG } from '../config/chatConfig';
import { useChatStore } from '../store/chatStore';

/**
 * チャット機能のカスタムフック
 *
 * このフックは、ChatServiceと連携してチャット機能を提供します。
 * Phase 3: Zustandストアを使用した状態管理に移行
 */
export const useChat = () => {
  // Zustandストアから状態を取得
  const messages = useChatStore((state) => state.messages);
  const isLoading = useChatStore((state) => state.isLoading);
  const attachedFiles = useChatStore((state) => state.attachedFiles);
  const tokenUsage = useChatStore((state) => state.tokenUsage);

  const { settings } = useSettingsStore();

  // UI状態（リサイズ中かどうか）はローカルステートとして保持
  const [isResizing, setIsResizing] = useState(false);

  const chatAreaHeight = useRef(new Animated.Value(CHAT_CONFIG.ui.chatAreaInitialHeight)).current;
  const heightValue = useRef(CHAT_CONFIG.ui.chatAreaInitialHeight);

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
        setIsResizing(true);
      },
      onPanResponderMove: (_, gestureState) => {
        const newHeight = gestureStartHeight.current - gestureState.dy;

        let clampedHeight = newHeight;
        if (clampedHeight < CHAT_CONFIG.ui.chatAreaMinHeight) {
          clampedHeight = CHAT_CONFIG.ui.chatAreaMinHeight;
        } else if (clampedHeight > CHAT_CONFIG.ui.chatAreaMaxHeight) {
          clampedHeight = CHAT_CONFIG.ui.chatAreaMaxHeight;
        }

        chatAreaHeight.setValue(clampedHeight);
      },
      onPanResponderRelease: () => {
        setIsResizing(false);
      },
    })
  ).current;

  // ChatServiceからLLM設定を更新
  useEffect(() => {
    ChatService.setLLMConfig(settings.llmProvider, settings.llmModel);
  }, [settings.llmProvider, settings.llmModel]);

  const sendMessage = useCallback(async (inputText: string) => {
    logger.debug('chat', '[useChat] sendMessage called with:', { inputText });
    await ChatService.sendMessage(inputText);
  }, []);

  const resetChat = useCallback(() => {
    logger.debug('chat', '[useChat] resetChat called');
    ChatService.resetChat();
  }, []);

  const clearAttachedFiles = useCallback(() => {
    logger.debug('chat', '[useChat] clearAttachedFiles called');
    ChatService.clearAttachedFiles();
  }, []);

  const removeAttachedFile = useCallback((index: number) => {
    logger.debug('chat', '[useChat] removeAttachedFile called', { index });
    ChatService.removeAttachedFile(index);
  }, []);

  const summarizeConversation = useCallback(async () => {
    logger.debug('chat', '[useChat] summarizeConversation called');
    await ChatService.summarizeConversation();
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    resetChat,
    chatAreaHeight,
    panResponder,
    isResizing,
    attachedFiles,
    clearAttachedFiles,
    removeAttachedFile,
    tokenUsage,
    summarizeConversation,
  };
};
