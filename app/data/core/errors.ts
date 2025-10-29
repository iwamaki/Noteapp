/**
 * @file errors.ts
 * @summary データレイヤー用カスタムエラークラス
 * @description
 * FileSystem操作やリポジトリ操作で発生するエラーを表現します。
 */

/**
 * FileSystem操作エラー
 *
 * @example
 * throw new FileSystemV2Error(
 *   'Failed to create file',
 *   'CREATE_FILE_ERROR',
 *   originalError
 * );
 */
export class FileSystemV2Error extends Error {
  /**
   * @param message - エラーメッセージ
   * @param code - エラーコード（例: 'CREATE_FILE_ERROR', 'FILE_NOT_FOUND'）
   * @param originalError - 元となったエラー（オプション）
   */
  constructor(
    message: string,
    public code: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'FileSystemV2Error';

    // スタックトレースを保持
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FileSystemV2Error);
    }
  }
}

/**
 * Repository操作エラー
 *
 * @example
 * throw new RepositoryError(
 *   'Failed to get file by ID',
 *   'GET_FILE_ERROR',
 *   originalError
 * );
 */
export class RepositoryError extends Error {
  /**
   * @param message - エラーメッセージ
   * @param code - エラーコード
   * @param originalError - 元となったエラー（オプション）
   */
  constructor(
    message: string,
    public code: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'RepositoryError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RepositoryError);
    }
  }
}

// =============================================================================
// Error Codes (エラーコード定数)
// =============================================================================

/**
 * 一般的なエラーコード定数
 */
export const ErrorCodes = {
  // FileSystem関連
  INIT_ERROR: 'INIT_ERROR',
  CREATE_ERROR: 'CREATE_ERROR',
  READ_ERROR: 'READ_ERROR',
  WRITE_ERROR: 'WRITE_ERROR',
  DELETE_ERROR: 'DELETE_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',

  // Repository関連
  GET_ERROR: 'GET_ERROR',
  UPDATE_ERROR: 'UPDATE_ERROR',
  MOVE_ERROR: 'MOVE_ERROR',
  COPY_ERROR: 'COPY_ERROR',

  // 特殊なケース
  INVALID_INPUT: 'INVALID_INPUT',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
