/**
 * @file chatConfig.ts
 * @summary チャット機能の設定値を一元管理
 * @responsibility ハードコードされた設定値を定数として定義し、変更を容易にする
 */

import { DimensionValue } from 'react-native';

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

  /**
   * チャットUIコンポーネントの定数
   */
  components: {
    /** スペーシング（padding/margin） */
    spacing: {
      xs: 2,
      sm: 4,
      md: 8,
      lg: 10,
      xl: 10,
      xxl: 16,
    },

    /** ボーダー設定 */
    border: {
      width: 1,
      radius: {
        small: 4,
        medium: 12,
        large: 16,
        pill: 18,
      },
    },

    /** アイコンサイズ */
    icon: {
      small: 12,
      medium: 14,
    },

    /** フォントサイズ */
    fontSize: {
      small: 11,
      medium: 12,
    },

    /** 透明度 */
    opacity: {
      disabled: 0.5,
      muted: 0.7,
      summarized: 0.5,
    },

    /** メッセージ関連のサイズ */
    message: {
      /** メッセージの最大幅（%） */
      maxWidth: '85%' as DimensionValue,
      /** 添付ファイル名の最大幅 */
      maxFileNameWidth: 120,
    },

    /** 入力エリア関連 */
    input: {
      /** テキスト入力の最大文字数 */
      maxLength: 2000,
      /** 入力エリアの最大高さ */
      maxHeight: 100,
      /** 入力エリアの最小高さ */
      minHeight: 44,
      /** 送信ボタンのサイズ */
      buttonSize: 36,
    },

    /** 添付ファイル表示関連 */
    attachedFile: {
      /** ファイル名表示の最大幅 */
      maxNameWidth: 120,
      /** ファイルアイテムの余白 */
      itemSpacing: 6,
    },
  },

  /**
   * マークダウンレンダリングの設定
   */
  markdown: {
    /** 画像の最大幅比率（画面幅に対する割合） */
    imageMaxWidthRatio: 0.8,
    /** 画像ローディング時のデフォルト高さ */
    imageLoadingHeight: 200,
    /** 画像の角丸 */
    imageBorderRadius: 8,
    /** 画像の上下マージン */
    imageVerticalMargin: 8,
  },
};
