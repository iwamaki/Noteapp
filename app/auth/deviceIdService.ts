/**
 * @file deviceIdService.ts
 * @summary デバイスID生成・管理サービス
 * @responsibility デバイスの一意識別子を生成・保存・取得する
 *
 * Security Note:
 * - expo-secure-store を使用して暗号化された永続ストレージに保存
 * - アプリキャッシュ削除後も認証情報を保持
 * - iOS: Keychain、Android: Keystore を使用
 * - 開発ビルド（expo-dev-client）が必要（Expo Goでは動作しません）
 */

import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

const DEVICE_ID_KEY = 'noteapp_device_id';
const USER_ID_KEY = 'noteapp_user_id';

/**
 * デバイスIDを取得（存在しない場合は生成）
 * @returns デバイスID（UUID v4）
 */
export async function getOrCreateDeviceId(): Promise<string> {
  try {
    // 既存のデバイスIDを取得（SecureStoreから）
    const existingDeviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);

    if (existingDeviceId) {
      return existingDeviceId;
    }

    // 新しいデバイスIDを生成
    const newDeviceId = uuidv4();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, newDeviceId);

    logger.info('auth', 'New device ID generated and stored in SecureStore', { deviceId: newDeviceId });
    return newDeviceId;

  } catch (error) {
    logger.error('auth', 'Failed to get or create device ID', error);
    throw new Error('Failed to manage device ID');
  }
}

/**
 * ユーザーIDを保存
 * @param userId ユーザーID
 */
export async function saveUserId(userId: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(USER_ID_KEY, userId);
    logger.info('auth', 'User ID saved to SecureStore', { userId });
  } catch (error) {
    logger.error('auth', 'Failed to save user ID', error);
    throw new Error('Failed to save user ID');
  }
}

/**
 * ユーザーIDを取得
 * @returns ユーザーID（存在しない場合はnull）
 */
export async function getUserId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(USER_ID_KEY);
  } catch (error) {
    logger.error('auth', 'Failed to get user ID', error);
    return null;
  }
}

/**
 * デバイスIDとユーザーIDをクリア（デバッグ用）
 *
 * Note: SecureStoreから削除するため、アプリキャッシュ削除では消えません。
 * 完全なリセットが必要な場合のみ使用してください。
 */
export async function clearAuthData(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
    await SecureStore.deleteItemAsync(USER_ID_KEY);
    logger.info('auth', 'Auth data cleared from SecureStore');
  } catch (error) {
    logger.error('auth', 'Failed to clear auth data', error);
    throw new Error('Failed to clear auth data');
  }
}
