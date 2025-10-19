/**
 * @file verifyAsyncStorage.ts
 * @summary AsyncStorage検証タスク
 * @responsibility AsyncStorageが正常に動作することを確認します（CRITICAL優先度）
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { InitializationTask, InitializationStage, TaskPriority } from '../types';

const TEST_KEY = '@init_test_key';

/**
 * AsyncStorage検証タスク
 *
 * アプリケーションの永続化レイヤーが正常に動作することを確認します。
 * これは全ての初期化タスクの前提条件です。
 */
export const verifyAsyncStorageTask: InitializationTask = {
  id: 'verify-async-storage',
  name: 'AsyncStorage検証',
  description: 'AsyncStorageの読み書きが正常に動作することを確認します',
  stage: InitializationStage.CRITICAL,
  priority: TaskPriority.CRITICAL,
  dependencies: [],

  execute: async () => {
    // テストデータを書き込み
    await AsyncStorage.setItem(TEST_KEY, 'test_value');

    // テストデータを読み込み
    const value = await AsyncStorage.getItem(TEST_KEY);

    if (value !== 'test_value') {
      throw new Error('AsyncStorage read/write verification failed');
    }

    // テストデータを削除
    await AsyncStorage.removeItem(TEST_KEY);
  },

  retry: {
    maxAttempts: 2,
    delayMs: 300,
  },

  timeout: 5000, // 5秒
};
