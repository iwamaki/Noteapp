/**
 * @file chatStore.ts
 * @summary Zustandを使用してチャット機能の状態を管理します
 * @responsibility チャットメッセージ、ローディング状態、添付ファイル、トークン使用量を一元管理し、
 *                 手動リスナーパターンからリアクティブな状態管理への移行を実現します
 */

import { create } from 'zustand';
import { ChatMessage, TokenUsageInfo } from '../llmService/types/index';

/**
 * チャットストアの状態と操作を定義するインターフェース
 */
interface ChatStore {
  // State
  /** チャットメッセージの履歴 */
  messages: ChatMessage[];
  /** ローディング状態 */
  isLoading: boolean;
  /** 添付ファイルのリスト */
  attachedFiles: Array<{ filename: string; content: string }>;
  /** トークン使用量情報 */
  tokenUsage: TokenUsageInfo | null;

  // Actions
  /** メッセージを設定 */
  setMessages: (messages: ChatMessage[]) => void;
  /** ローディング状態を設定 */
  setIsLoading: (isLoading: boolean) => void;
  /** 添付ファイルを設定 */
  setAttachedFiles: (files: Array<{ filename: string; content: string }>) => void;
  /** トークン使用量を設定 */
  setTokenUsage: (tokenUsage: TokenUsageInfo | null) => void;
  /** 全状態をリセット */
  reset: () => void;
}

/**
 * 初期状態
 */
const initialState = {
  messages: [],
  isLoading: false,
  attachedFiles: [],
  tokenUsage: null,
};

/**
 * チャット状態管理用のZustandストア
 *
 * 使用例:
 * ```typescript
 * const { messages, isLoading, setMessages } = useChatStore();
 * ```
 */
export const useChatStore = create<ChatStore>((set) => ({
  ...initialState,

  setMessages: (messages) => {
    set({ messages });
  },

  setIsLoading: (isLoading) => {
    set({ isLoading });
  },

  setAttachedFiles: (attachedFiles) => {
    set({ attachedFiles });
  },

  setTokenUsage: (tokenUsage) => {
    set({ tokenUsage });
  },

  reset: () => {
    set(initialState);
  },
}));
