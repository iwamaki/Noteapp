/**
 * @file loggerConfig.ts
 * @summary ログレベルに基づいたロギング制御を提供します。
 * @responsibility 環境変数に基づいてログ出力を制御し、開発・本番環境で適切なログレベルを維持します。
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

class LoggerConfig {
  private currentLevel: LogLevel;

  constructor() {
    // 環境変数からログレベルを取得（デフォルトは開発時debug、本番時error）
    const envLevel = process.env.EXPO_PUBLIC_LOG_LEVEL as LogLevel;
    this.currentLevel = envLevel || (__DEV__ ? 'debug' : 'error');
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.currentLevel];
  }

  debug(prefix: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(`[${prefix}]`, ...args);
    }
  }

  info(prefix: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(`[${prefix}]`, ...args);
    }
  }

  warn(prefix: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[${prefix}]`, ...args);
    }
  }

  error(prefix: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(`[${prefix}]`, ...args);
    }
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  getLevel(): LogLevel {
    return this.currentLevel;
  }
}

export const loggerConfig = new LoggerConfig();
