/**
 * @file errorHandler.ts
 * @summary 統一エラーハンドラー
 * @responsibility アプリケーション全体で一貫したエラー処理、分類、ユーザーメッセージ生成、ログ記録を提供
 */

import { logger } from '../../../utils/logger';
import { ChatMessage } from '../llmService/types/types';
import { LLMError } from '../llmService/types/LLMError';

/**
 * エラータイプの列挙
 */
export enum ErrorType {
  /** ネットワーク接続エラー */
  NETWORK = 'NETWORK',
  /** タイムアウトエラー */
  TIMEOUT = 'TIMEOUT',
  /** 入力検証エラー */
  VALIDATION = 'VALIDATION',
  /** ファイル操作エラー */
  FILE_OPERATION = 'FILE_OPERATION',
  /** LLM API エラー */
  LLM_API = 'LLM_API',
  /** 不明なエラー */
  UNKNOWN = 'UNKNOWN',
}

/**
 * エラーコンテキスト情報
 */
export interface ErrorContext {
  /** エラーが発生した場所（例: 'chatService', 'createFileHandler'） */
  location: string;
  /** 実行していた操作（例: 'sendMessage', 'createFile'） */
  operation?: string;
  /** 追加のコンテキスト情報 */
  metadata?: Record<string, any>;
}

/**
 * 統一エラーハンドラークラス
 */
export class UnifiedErrorHandler {
  /**
   * エラーを分類
   * @param error 元のエラー
   * @returns エラータイプ
   */
  static classifyError(error: unknown): ErrorType {
    // LLMErrorの場合
    if (error instanceof LLMError) {
      switch (error.code) {
        case 'NETWORK_ERROR':
          return ErrorType.NETWORK;
        case 'TIMEOUT_ERROR':
          return ErrorType.TIMEOUT;
        case 'HTTP_ERROR':
          return ErrorType.LLM_API;
        default:
          return ErrorType.LLM_API;
      }
    }

    // エラーメッセージからの推論
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // ネットワークエラー
      if (
        message.includes('network') ||
        message.includes('fetch') ||
        message.includes('connection') ||
        message.includes('サーバーから応答がありません')
      ) {
        return ErrorType.NETWORK;
      }

      // タイムアウトエラー
      if (message.includes('timeout') || message.includes('タイムアウト')) {
        return ErrorType.TIMEOUT;
      }

      // バリデーションエラー
      if (
        message.includes('指定されていません') ||
        message.includes('無効な') ||
        message.includes('必要です') ||
        message.includes('が見つかりません')
      ) {
        return ErrorType.VALIDATION;
      }

      // ファイル操作エラー
      if (
        message.includes('ファイル') &&
        (message.includes('失敗') || message.includes('できません'))
      ) {
        return ErrorType.FILE_OPERATION;
      }
    }

    return ErrorType.UNKNOWN;
  }

  /**
   * エラータイプに応じたユーザー向けメッセージを生成
   * @param errorType エラータイプ
   * @param error 元のエラー
   * @returns ユーザーフレンドリーなエラーメッセージ
   */
  static getUserMessage(errorType: ErrorType, error: unknown): string {
    const baseMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';

    switch (errorType) {
      case ErrorType.NETWORK:
        return `❌ **ネットワークエラー**\n\nサーバーとの通信に失敗しました。\n\n**対処方法:**\n- ネットワーク接続を確認してください\n- サーバーが起動していることを確認してください\n- VPNやファイアウォールの設定を確認してください`;

      case ErrorType.TIMEOUT:
        return `⏱️ **タイムアウトエラー**\n\nリクエストの処理に時間がかかりすぎています。\n\n**対処方法:**\n- もう一度お試しください\n- 送信するメッセージや添付ファイルのサイズを減らしてください\n- サーバーの負荷状況を確認してください`;

      case ErrorType.VALIDATION:
        return `⚠️ **入力エラー**\n\n${baseMessage}\n\n**対処方法:**\n- 入力内容を確認してください\n- 必要な情報がすべて入力されているか確認してください`;

      case ErrorType.FILE_OPERATION:
        return `📁 **ファイル操作エラー**\n\n${baseMessage}\n\n**対処方法:**\n- ファイル名が正しいか確認してください\n- ファイルが存在するか確認してください\n- 同じ名前のファイルが既に存在しないか確認してください`;

      case ErrorType.LLM_API:
        return `🤖 **LLM APIエラー**\n\n${baseMessage}\n\n**対処方法:**\n- サーバーが正常に動作しているか確認してください\n- API設定（プロバイダー、モデル）を確認してください\n- しばらく時間をおいてから再試行してください`;

      case ErrorType.UNKNOWN:
      default:
        return `❌ **予期しないエラー**\n\n${baseMessage}\n\n**対処方法:**\n- もう一度お試しください\n- 問題が解決しない場合は、アプリを再起動してください`;
    }
  }

  /**
   * エラーをログに記録
   * @param context エラーコンテキスト
   * @param error 元のエラー
   * @param errorType エラータイプ
   */
  static logError(context: ErrorContext, error: unknown, errorType: ErrorType): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    // context.locationをLogCategoryにマッピング
    const logCategory = this.mapLocationToCategory(context.location);

    logger.error(logCategory, `[${context.location}] Error in ${context.operation || 'operation'}:`, {
      errorType,
      message: errorMessage,
      stack,
      metadata: context.metadata,
    });

    // コンソールにも出力（開発時のデバッグ用）
    if (__DEV__) {
      console.error(`[${context.location}] ${errorType}:`, error);
    }
  }

  /**
   * エラー発生場所をLogCategoryにマッピング
   * @param location エラー発生場所
   * @returns LogCategory
   */
  private static mapLocationToCategory(location: string): 'chatService' | 'toolService' | 'llm' | 'system' {
    if (location.includes('chat') || location.includes('Chat')) {
      return 'chatService';
    }
    if (location.includes('Handler') || location.includes('handler')) {
      return 'toolService';
    }
    if (location.includes('llm') || location.includes('LLM')) {
      return 'llm';
    }
    return 'system';
  }

  /**
   * エラーからChatMessageを作成（チャット画面でシステムメッセージとして表示）
   * @param error 元のエラー
   * @returns システムメッセージ
   */
  static createSystemMessage(error: unknown): ChatMessage {
    const errorType = this.classifyError(error);
    const userMessage = this.getUserMessage(errorType, error);

    return {
      role: 'system',
      content: userMessage,
      timestamp: new Date(),
    };
  }

  /**
   * チャットサービス用の統合エラーハンドラー
   * システムメッセージを作成してログを記録
   *
   * @param context エラーコンテキスト
   * @param error 元のエラー
   * @returns システムメッセージ
   */
  static handleChatError(context: ErrorContext, error: unknown): ChatMessage {
    const errorType = this.classifyError(error);
    this.logError(context, error, errorType);
    return this.createSystemMessage(error);
  }

  /**
   * コマンドハンドラー用の統合エラーハンドラー
   * エラーをログに記録し、ユーザーフレンドリーなErrorを再throw
   *
   * @param context エラーコンテキスト
   * @param operation 実行していた操作名（例: 'ファイルの作成'）
   * @param error 元のエラー
   * @throws ユーザーフレンドリーなエラーメッセージを持つError
   */
  static handleCommandError(
    context: ErrorContext,
    operation: string,
    error: unknown
  ): never {
    const errorType = this.classifyError(error);
    this.logError(context, error, errorType);

    // ユーザーフレンドリーなエラーメッセージを生成
    const baseMessage = error instanceof Error ? error.message : '不明なエラー';
    const userFriendlyMessage = `${operation}に失敗しました: ${baseMessage}`;

    throw new Error(userFriendlyMessage);
  }

  /**
   * LLMService用のエラーハンドラー（既存のErrorHandlerと互換性を保つ）
   * @param error 元のエラー
   * @param requestId リクエストID
   * @param context エラーコンテキスト
   * @throws LLMError
   */
  static handleLLMError(error: unknown, requestId: number, context: ErrorContext): never {
    const errorType = this.classifyError(error);
    this.logError(
      {
        ...context,
        metadata: { ...context.metadata, requestId },
      },
      error,
      errorType
    );

    // 既にLLMErrorの場合はそのままスロー
    if (error instanceof LLMError) {
      throw error;
    }

    // 新しいLLMErrorを作成してスロー
    const message = error instanceof Error ? error.message : String(error);
    throw new LLMError(message, errorType);
  }
}
