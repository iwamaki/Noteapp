/**
 * @file clientId.ts
 * @summary WebSocket接続用のクライアントIDを生成・管理します
 * @responsibility クライアントIDの生成、永続化、取得
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../../../utils/logger';

const CLIENT_ID_KEY = 'websocket_client_id';

/**
 * ランダムなクライアントIDを生成
 *
 * 形式: "client_<timestamp>_<random>"
 * 例: "client_1698765432123_a1b2c3d4"
 */
function generateClientId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `client_${timestamp}_${random}`;
}

/**
 * クライアントIDを取得（存在しない場合は生成）
 *
 * クライアントIDはAsyncStorageに保存され、
 * アプリを再起動しても同じIDが使用されます。
 * これにより、WebSocket接続の再確立が容易になります。
 *
 * @returns クライアントID
 */
export async function getOrCreateClientId(): Promise<string> {
  try {
    // 既存のクライアントIDを取得
    const existingId = await AsyncStorage.getItem(CLIENT_ID_KEY);

    if (existingId) {
      logger.debug('clientId', `Using existing client ID: ${existingId}`);
      return existingId;
    }

    // 新しいクライアントIDを生成
    const newId = generateClientId();
    await AsyncStorage.setItem(CLIENT_ID_KEY, newId);

    logger.info('clientId', `Generated new client ID: ${newId}`);
    return newId;

  } catch (error) {
    logger.error('clientId', 'Failed to get/create client ID:', error);

    // エラーの場合は一時的なIDを生成（保存しない）
    const tempId = generateClientId();
    logger.warn('clientId', `Using temporary client ID: ${tempId}`);
    return tempId;
  }
}

/**
 * クライアントIDをリセット（新しいIDを生成）
 *
 * デバッグやトラブルシューティング用。
 * 通常のアプリ動作では使用しません。
 */
export async function resetClientId(): Promise<string> {
  try {
    await AsyncStorage.removeItem(CLIENT_ID_KEY);
    logger.info('clientId', 'Client ID reset');

    return await getOrCreateClientId();
  } catch (error) {
    logger.error('clientId', 'Failed to reset client ID:', error);
    throw error;
  }
}
