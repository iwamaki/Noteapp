/**
 * @file services/ErrorService.ts
 * @summary エラー処理サービス
 * @description エラーの表示とハンドリングを一元管理
 */

import { Alert } from 'react-native';
import { EditorError, ErrorCode } from '../types';

/**
 * エラー処理サービス
 * エラーメッセージの表示とリトライ処理を統一的に管理
 */
export class ErrorService {
  private static instance: ErrorService;

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): ErrorService {
    if (!this.instance) {
      this.instance = new ErrorService();
    }
    return this.instance;
  }

  /**
   * エラーをハンドル（アラート表示など）
   */
  handleError(
    error: EditorError,
    options?: {
      showAlert?: boolean;
      onRetry?: () => void;
      onDismiss?: () => void;
    }
  ): void {
    const { showAlert = true, onRetry, onDismiss } = options || {};

    if (!showAlert) return;

    const buttons: any[] = [
      {
        text: 'OK',
        onPress: onDismiss,
      },
    ];

    if (error.recoverable && (onRetry || error.retry)) {
      buttons.unshift({
        text: 'リトライ',
        onPress: onRetry || error.retry,
      });
    }

    Alert.alert(this.getErrorTitle(error.code), error.message, buttons);
  }

  /**
   * エラーコードからタイトルを取得
   */
  private getErrorTitle(code: ErrorCode): string {
    switch (code) {
      case ErrorCode.SAVE_FAILED:
        return '保存エラー';
      case ErrorCode.LOAD_FAILED:
        return '読み込みエラー';
      case ErrorCode.NETWORK_ERROR:
        return 'ネットワークエラー';
      case ErrorCode.VALIDATION_ERROR:
        return '入力エラー';
      case ErrorCode.NOT_FOUND:
        return 'ノートが見つかりません';
      case ErrorCode.STORAGE_ERROR:
        return 'ストレージエラー';
      default:
        return 'エラー';
    }
  }

  /**
   * 標準エラーからEditorErrorを作成
   */
  createError(
    error: Error | unknown,
    code: ErrorCode = ErrorCode.STORAGE_ERROR,
    recoverable: boolean = true
  ): EditorError {
    const message =
      error instanceof Error ? error.message : '予期しないエラーが発生しました';

    return {
      code,
      message,
      recoverable,
    };
  }
}

/**
 * シングルトンインスタンスをエクスポート
 */
export const errorService = ErrorService.getInstance();
