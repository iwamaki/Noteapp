/**
 * @file errorTypes.ts
 * @summary エラータイプの定義
 * @responsibility エラーの分類に使用する列挙型を提供
 */

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
