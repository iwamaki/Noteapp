/**
 * @file useConversationStore.ts
 * @summary 会話履歴を管理するZustand Store
 * @description
 * チャット会話履歴の状態を一元管理し、
 * 複数コンポーネントから簡単にアクセスできるようにします。
 * @responsibility 会話履歴の追加、削除、取得、要約
 */

import { create } from 'zustand';
import { logger } from '../../../utils/logger';
import type { ChatMessage } from '../types/message.types';
import { CHAT_CONFIG } from '../../chat/config/chatConfig';

// =============================================================================
// Types
// =============================================================================

/**
 * 会話履歴ストアの状態
 */
interface ConversationState {
  // 会話履歴
  history: ChatMessage[];

  // 設定
  maxHistorySize: number;
}

/**
 * 会話履歴ストアのアクション
 */
interface ConversationActions {
  // メッセージ追加
  addMessage: (message: ChatMessage) => void;
  addExchange: (
    userMessage: string,
    aiResponse: string,
    attachedFiles?: Array<{ filename: string; content: string }>
  ) => void;

  // 履歴管理
  getHistory: () => ChatMessage[];
  clear: () => void;
  setHistory: (history: ChatMessage[]) => void;

  // ユーティリティ
  getHistoryStatus: () => { count: number; totalChars: number };
}

/**
 * ストアの型定義
 */
type ConversationStore = ConversationState & ConversationActions;

// =============================================================================
// Store
// =============================================================================

/**
 * 会話履歴管理用のZustand Store
 */
export const useConversationStore = create<ConversationStore>((set, get) => ({
  // ===== 初期状態 =====
  history: [],
  maxHistorySize: CHAT_CONFIG.llm.maxHistorySize,

  // ===== メッセージ追加 =====

  /**
   * 単一のメッセージを追加
   */
  addMessage: (message: ChatMessage) => {
    set((state) => {
      const newHistory = [...state.history, message];

      // 履歴サイズの制限を適用
      const trimmedHistory =
        newHistory.length > state.maxHistorySize
          ? newHistory.slice(-state.maxHistorySize)
          : newHistory;

      logger.debug(
        'llm',
        `Added message to conversation history (${trimmedHistory.length}/${state.maxHistorySize})`
      );

      return { history: trimmedHistory };
    });
  },

  /**
   * ユーザーメッセージとAIレスポンスのペアを追加
   */
  addExchange: (
    userMessage: string,
    aiResponse: string,
    attachedFiles?: Array<{ filename: string; content: string }>
  ) => {
    const timestamp = new Date();

    set((state) => {
      // ユーザーメッセージを追加
      const userMsg: ChatMessage = {
        role: 'user',
        content: userMessage,
        timestamp,
        attachedFiles: attachedFiles && attachedFiles.length > 0 ? attachedFiles : undefined,
      };

      // AIレスポンスを追加
      const aiMsg: ChatMessage = {
        role: 'ai',
        content: aiResponse,
        timestamp,
      };

      const newHistory = [...state.history, userMsg, aiMsg];

      // 履歴サイズの制限を適用
      const trimmedHistory =
        newHistory.length > state.maxHistorySize
          ? newHistory.slice(-state.maxHistorySize)
          : newHistory;

      logger.debug(
        'llm',
        `Added exchange to conversation history (${trimmedHistory.length}/${state.maxHistorySize})`
      );

      return { history: trimmedHistory };
    });
  },

  // ===== 履歴管理 =====

  /**
   * 会話履歴を取得（コピーを返す）
   */
  getHistory: () => {
    return [...get().history];
  },

  /**
   * 会話履歴をクリア
   */
  clear: () => {
    logger.info('llm', 'Clearing conversation history');
    set({ history: [] });
  },

  /**
   * 会話履歴を設定（要約後の復元などに使用）
   */
  setHistory: (history: ChatMessage[]) => {
    logger.info('llm', `Setting conversation history (${history.length} messages)`);
    set({ history });
  },

  // ===== ユーティリティ =====

  /**
   * 会話履歴のステータスを取得
   */
  getHistoryStatus: () => {
    const { history } = get();
    const totalChars = history.reduce((sum, msg) => sum + msg.content.length, 0);

    return {
      count: history.length,
      totalChars,
    };
  },
}));
