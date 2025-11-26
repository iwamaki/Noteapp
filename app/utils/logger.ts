// app/utils/logger.ts
import { AppState, AppStateStatus } from 'react-native';

type LogCategory = 'chat' | 'chatService' | 'system' | 'file' | 'diff' | 'llm' | 'rag' | 'default' | 'tree' | 'platformInfo' | 'toolService' | 'editFileHandler' | 'createDirectoryHandler' | 'deleteItemHandler' | 'moveItemHandler' | 'itemResolver' | 'websocket' | 'clientId' | 'subscriptionSync' | 'billingApi' | 'billing' | 'auth' | 'api' | 'httpClient' | 'init' | 'errorLogApi' | string;
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

// エラーログサービスの型（循環参照を避けるため）
interface ErrorLogService {
  sendErrorLog(entry: {
    level: 'error' | 'warn';
    category: string;
    message: string;
    stackTrace?: string;
    additionalData?: string;
  }): Promise<void>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

class Logger {
  private enabledCategories: LogCategory[] | 'all' = 'all';
  private currentLevel: LogLevel = 'debug';
  private appState = AppState.currentState;
  private errorLogService: ErrorLogService | null = null;
  private sendToBackend = false;

  constructor() {
    // 環境変数からログレベルを取得
    const envLevel = process.env.EXPO_PUBLIC_LOG_LEVEL as LogLevel;
    this.currentLevel = envLevel || (__DEV__ ? 'debug' : 'error');

    // 環境変数からカテゴリを取得（カンマ区切り）
    const envCategories = process.env.EXPO_PUBLIC_LOG_CATEGORIES;
    if (envCategories) {
      if (envCategories === 'all') {
        this.enabledCategories = 'all';
      } else {
        this.enabledCategories = envCategories.split(',').map((c: string) => c.trim()) as LogCategory[];
      }
    }

    this._setupAppStateListener();
  }

  private _setupAppStateListener() {
    AppState.addEventListener('change', this._handleAppStateChange);
  }

  private _handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (this.appState.match(/inactive|background/) && nextAppState === 'active') {
      this.info('system', 'App has come to the foreground!');
    }
    this.appState = nextAppState;
    this.debug('system', `AppState changed to: ${nextAppState}`);
  };

  setCategories(categories: LogCategory[] | 'all') {
    this.enabledCategories = categories;
  }

  setLevel(level: LogLevel) {
    this.currentLevel = level;
  }

  getLevel(): LogLevel {
    return this.currentLevel;
  }

  /**
   * エラーログサービスを設定（バックエンド送信を有効化）
   */
  setErrorLogService(service: ErrorLogService): void {
    this.errorLogService = service;
    this.sendToBackend = true;
  }

  /**
   * バックエンド送信を有効/無効化
   */
  setSendToBackend(enabled: boolean): void {
    this.sendToBackend = enabled;
  }

  /**
   * バックエンド送信が有効かどうか
   */
  isSendToBackendEnabled(): boolean {
    return this.sendToBackend && this.errorLogService !== null;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.currentLevel];
  }

  private _log(level: LogLevel, category: LogCategory, message: string, ...args: any[]) {
    // ログレベルチェック
    if (!this.shouldLog(level)) {
      return;
    }

    // カテゴリチェック
    if (this.enabledCategories !== 'all' && !this.enabledCategories.includes(category)) {
      return;
    }

    // 全てのログレベルでJSON形式で出力
    // 順番: level → category → message → data → timestamp
    const logEntry = {
      level: level.toUpperCase(),
      category: category,
      message: message,
      ...(args.length > 0 && { data: args }),
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(logEntry));

    // error/warnレベルはバックエンドに送信
    // 無限ループを防ぐため、errorLogApi自身のログは送信しない
    if (
      this.sendToBackend &&
      this.errorLogService &&
      (level === 'error' || level === 'warn') &&
      category !== 'errorLogApi'
    ) {
      // スタックトレースを取得
      let stackTrace: string | undefined;
      if (level === 'error') {
        const error = args.find((arg) => arg instanceof Error);
        if (error) {
          stackTrace = error.stack;
        }
      }

      // 追加データをJSON文字列に変換
      let additionalData: string | undefined;
      if (args.length > 0) {
        try {
          additionalData = JSON.stringify(args);
        } catch {
          additionalData = String(args);
        }
      }

      // 非同期で送信（結果を待たない）
      this.errorLogService
        .sendErrorLog({
          level,
          category,
          message,
          stackTrace,
          additionalData,
        })
        .catch(() => {
          // 送信失敗は無視（無限ループ防止）
        });
    }
  }

  debug(category: LogCategory, message: string, ...args: any[]) {
    this._log('debug', category, message, ...args);
  }

  info(category: LogCategory, message: string, ...args: any[]) {
    this._log('info', category, message, ...args);
  }

  warn(category: LogCategory, message: string, ...args: any[]) {
    this._log('warn', category, message, ...args);
  }

  error(category: LogCategory, message: string, ...args: any[]) {
    this._log('error', category, message, ...args);
  }
}

export const logger = new Logger();
