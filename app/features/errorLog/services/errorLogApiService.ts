/**
 * @file errorLogApiService.ts
 * @summary Backend error log API service layer
 * @description
 * Sends frontend error logs to the backend for user support and debugging.
 */

import { createHttpClient, HttpClient } from '../../api';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ======================
// Type Definitions
// ======================

export interface ErrorLogEntry {
  level: 'error' | 'warn';
  category: string;
  message: string;
  stackTrace?: string;
  additionalData?: string;
  deviceId?: string;
}

interface ErrorLogResponse {
  success: boolean;
  log_id: number;
}

interface ErrorLogBatchResponse {
  success: boolean;
  count: number;
}

// ======================
// Error Log API Service
// ======================

export class ErrorLogApiService {
  private client: HttpClient;
  private pendingLogs: ErrorLogEntry[] = [];
  private isSending = false;
  private readonly maxPendingLogs = 100;
  private readonly batchSize = 10;
  private readonly appVersion: string;
  private readonly platform: string;

  constructor(baseUrl: string) {
    this.client = createHttpClient({
      baseUrl: `${baseUrl}/api/error-logs`,
      timeout: 5000,
      includeAuth: true,
      logContext: 'errorLogApi',
    });

    this.appVersion = Constants.expoConfig?.version || 'unknown';
    this.platform = Platform.OS;
  }

  /**
   * エラーログを送信（キューに追加し、バッチで送信）
   */
  async sendErrorLog(entry: ErrorLogEntry): Promise<void> {
    // キューに追加
    this.pendingLogs.push({
      ...entry,
      additionalData: entry.additionalData
        ? JSON.stringify(entry.additionalData)
        : undefined,
    });

    // キューが溢れないように制限
    if (this.pendingLogs.length > this.maxPendingLogs) {
      this.pendingLogs = this.pendingLogs.slice(-this.maxPendingLogs);
    }

    // バッチ送信を試みる
    await this.flushLogs();
  }

  /**
   * 保留中のログを送信
   */
  async flushLogs(): Promise<void> {
    if (this.isSending || this.pendingLogs.length === 0) {
      return;
    }

    this.isSending = true;

    try {
      // バッチサイズ分のログを取得
      const logsToSend = this.pendingLogs.slice(0, this.batchSize);

      if (logsToSend.length === 1) {
        // 単一ログの場合
        await this.sendSingleLog(logsToSend[0]);
      } else {
        // 複数ログの場合はバッチ送信
        await this.sendBatchLogs(logsToSend);
      }

      // 送信成功したログを削除
      this.pendingLogs = this.pendingLogs.slice(logsToSend.length);

      // まだ残っていれば再度送信
      if (this.pendingLogs.length > 0) {
        // 少し待ってから再送信（レート制限対策）
        setTimeout(() => this.flushLogs(), 1000);
      }
    } catch {
      // 送信失敗時はログを保持（次回再試行）
      // コンソールにはエラーを出力しない（無限ループ防止）
    } finally {
      this.isSending = false;
    }
  }

  /**
   * 単一ログを送信
   */
  private async sendSingleLog(entry: ErrorLogEntry): Promise<void> {
    await this.client.post<ErrorLogResponse>('', {
      level: entry.level,
      category: entry.category,
      message: entry.message,
      stack_trace: entry.stackTrace,
      additional_data: entry.additionalData,
      app_version: this.appVersion,
      platform: this.platform,
      device_id: entry.deviceId,
    });
  }

  /**
   * バッチでログを送信
   */
  private async sendBatchLogs(entries: ErrorLogEntry[]): Promise<void> {
    await this.client.post<ErrorLogBatchResponse>('/batch', {
      logs: entries.map((entry) => ({
        level: entry.level,
        category: entry.category,
        message: entry.message,
        stack_trace: entry.stackTrace,
        additional_data: entry.additionalData,
        app_version: this.appVersion,
        platform: this.platform,
        device_id: entry.deviceId,
      })),
    });
  }

  /**
   * 保留中のログ数を取得
   */
  getPendingCount(): number {
    return this.pendingLogs.length;
  }
}

// ======================
// Singleton Instance
// ======================

let errorLogApiService: ErrorLogApiService | null = null;

/**
 * ErrorLogApiService を初期化
 */
export function initErrorLogApiService(backendUrl: string): void {
  if (errorLogApiService) {
    return;
  }

  errorLogApiService = new ErrorLogApiService(backendUrl);
}

/**
 * ErrorLogApiService のインスタンスを取得
 * 初期化されていない場合は null を返す（エラーを投げない）
 */
export function getErrorLogApiService(): ErrorLogApiService | null {
  return errorLogApiService;
}

/**
 * ErrorLogApiService が初期化されているかチェック
 */
export function isErrorLogApiServiceInitialized(): boolean {
  return errorLogApiService !== null;
}
