// app/screen/note-list/hooks/useErrorHandler.ts
import { useCallback } from 'react';
import { Alert } from 'react-native';
import { StorageError } from '../noteStorage/storage';

interface ErrorHandlerOptions {
  silent?: boolean;
  onError?: (error: Error) => void;
}

export interface ErrorHandler {
  handleError: (operation: string, error: unknown, options?: ErrorHandlerOptions) => void;
  wrapAsync: <T>(
    operation: string,
    fn: () => Promise<T>,
    options?: ErrorHandlerOptions
  ) => Promise<T | null>;
}

const ERROR_MESSAGES: Record<string, string> = {
  DUPLICATE_ITEM: '同じ名前のアイテムが既に存在します',
  NOT_FOUND: 'アイテムが見つかりません',
  FOLDER_NOT_EMPTY: 'フォルダが空ではありません',
  FETCH_ERROR: 'データの取得に失敗しました',
  SAVE_ERROR: 'データの保存に失敗しました',
};

export const useErrorHandler = (): ErrorHandler => {
  const handleError = useCallback((
    operation: string,
    error: unknown,
    options: ErrorHandlerOptions = {}
  ) => {
    const { silent = false, onError } = options;

    let message = 'エラーが発生しました';
    
    if (error instanceof StorageError) {
      message = ERROR_MESSAGES[error.code] || error.message;
      
      if (__DEV__) {
        console.error(`❌ ${operation} failed:`, {
          code: error.code,
          message: error.message,
          originalError: error.originalError,
        });
      }
    } else if (error instanceof Error) {
      message = error.message;
      
      if (__DEV__) {
        console.error(`❌ ${operation} failed:`, error);
      }
    }

    if (!silent) {
      Alert.alert(`${operation}に失敗しました`, message);
    }

    onError?.(error instanceof Error ? error : new Error(String(error)));
  }, []);

  const wrapAsync = useCallback(async <T,>(
    operation: string,
    fn: () => Promise<T>,
    options: ErrorHandlerOptions = {}
  ): Promise<T | null> => {
    try {
      return await fn();
    } catch (error) {
      handleError(operation, error, options);
      return null;
    }
  }, [handleError]);

  return { handleError, wrapAsync };
};