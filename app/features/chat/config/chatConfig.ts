/**
 * @file chatConfig.ts
 * @summary チャット機能の設定値を一元管理
 * @responsibility ハードコードされた設定値を定数として定義し、変更を容易にする
 */

/**
 * チャット機能全体の設定定数
 */
export const CHAT_CONFIG = {
  /**
   * チャットUIの高さ設定
   */
  ui: {
    /** チャットエリアの最小高さ（px） */
    chatAreaMinHeight: 150,
    /** チャットエリアの最大高さ（px） */
    chatAreaMaxHeight: 400,
    /** チャットエリアの初期高さ（px） */
    chatAreaInitialHeight: 250,
  },

  /**
   * WebSocket接続の設定
   */
  websocket: {
    /** 最大再接続試行回数 */
    maxReconnectAttempts: 5,
    /** 再接続の待機時間（ms） */
    reconnectDelay: 3000,
    /** ハートビート送信間隔（ms） */
    heartbeatInterval: 30000,
    /** ハートビートタイムアウト時間（ms） */
    heartbeatTimeout: 60000,
    /** タイムアウトチェック間隔（ms） */
    timeoutCheckInterval: 10000,
  },

  /**
   * LLMサービスの設定
   */
  llm: {
    /** 会話履歴の最大保持件数 */
    maxHistorySize: 100,
    /** APIリクエストのタイムアウト時間（ms） */
    apiTimeout: 30000,
    /** リクエスト間の最小間隔（ms） */
    minRequestInterval: 100,
    /** デフォルトのLLMプロバイダー */
    defaultProvider: 'openai',
    /** デフォルトのLLMモデル */
    defaultModel: 'gpt-3.5-turbo',
  },

  /**
   * ファイル検索の設定
   */
  search: {
    /** 検索結果スニペットの前後表示文字数 */
    snippetContextLength: 50,
  },
};
