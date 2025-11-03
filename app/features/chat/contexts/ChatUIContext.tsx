/**
 * @file ChatUIContext.tsx
 * @summary チャットUIコンポーネント間で共有される状態とメソッドを提供するContext
 * @responsibility Prop Drillingを解消し、チャット関連の状態と操作を一元管理
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { Animated, PanResponderInstance } from 'react-native';
import { ChatMessage, TokenUsageInfo } from '../llmService/types/types';

/**
 * ChatUIContextで提供される値の型定義
 */
interface ChatUIContextValue {
  // State
  messages: ChatMessage[];
  isLoading: boolean;
  attachedFiles: Array<{ filename: string; content: string }>;
  tokenUsage: TokenUsageInfo | null;
  chatAreaHeight: Animated.AnimatedValue;
  panResponder: PanResponderInstance;
  isResizing: boolean;

  // Actions
  sendMessage: (inputText: string) => Promise<void>;
  resetChat: () => void;
  removeAttachedFile: (index: number) => void;
  summarizeConversation: () => Promise<void>;
}

/**
 * ChatUIContext
 */
const ChatUIContext = createContext<ChatUIContextValue | undefined>(undefined);

/**
 * ChatUIContextのProvider Props
 */
interface ChatUIProviderProps {
  children: ReactNode;
  value: ChatUIContextValue;
}

/**
 * ChatUIContextのProvider
 */
export const ChatUIProvider: React.FC<ChatUIProviderProps> = ({ children, value }) => {
  return (
    <ChatUIContext.Provider value={value}>
      {children}
    </ChatUIContext.Provider>
  );
};

/**
 * ChatUIContextを使用するためのカスタムフック
 * @throws Context外で使用された場合にエラーをスロー
 */
export const useChatUI = (): ChatUIContextValue => {
  const context = useContext(ChatUIContext);
  if (context === undefined) {
    throw new Error('useChatUI must be used within a ChatUIProvider');
  }
  return context;
};
