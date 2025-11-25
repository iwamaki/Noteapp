/**
 * @file index.ts
 * @summary エラーログ機能のエントリーポイント
 */

export {
  ErrorLogApiService,
  initErrorLogApiService,
  getErrorLogApiService,
  isErrorLogApiServiceInitialized,
} from './services/errorLogApiService';

export type { ErrorLogEntry } from './services/errorLogApiService';
