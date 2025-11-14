/**
 * @file deviceIdService.ts
 * @summary デバイスID生成・管理サービス
 * @responsibility デバイスの一意識別子を生成・保存・取得する
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = '@noteapp:device_id';
const USER_ID_KEY = '@noteapp:user_id';

/**
 * デバイスIDを取得（存在しない場合は生成）
 * @returns デバイスID（UUID v4）
 */
export async function getOrCreateDeviceId(): Promise<string> {
  try {
    // 既存のデバイスIDを取得
    const existingDeviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

    if (existingDeviceId) {
      return existingDeviceId;
    }

    // 新しいデバイスIDを生成
    const newDeviceId = uuidv4();
    await AsyncStorage.setItem(DEVICE_ID_KEY, newDeviceId);

    console.log('[DeviceID] New device ID generated:', newDeviceId);
    return newDeviceId;

  } catch (error) {
    console.error('[DeviceID] Failed to get or create device ID:', error);
    throw new Error('Failed to manage device ID');
  }
}

/**
 * ユーザーIDを保存
 * @param userId ユーザーID
 */
export async function saveUserId(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_ID_KEY, userId);
    console.log('[DeviceID] User ID saved:', userId);
  } catch (error) {
    console.error('[DeviceID] Failed to save user ID:', error);
    throw new Error('Failed to save user ID');
  }
}

/**
 * ユーザーIDを取得
 * @returns ユーザーID（存在しない場合はnull）
 */
export async function getUserId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(USER_ID_KEY);
  } catch (error) {
    console.error('[DeviceID] Failed to get user ID:', error);
    return null;
  }
}

/**
 * デバイスIDとユーザーIDをクリア（デバッグ用）
 */
export async function clearAuthData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([DEVICE_ID_KEY, USER_ID_KEY]);
    console.log('[DeviceID] Auth data cleared');
  } catch (error) {
    console.error('[DeviceID] Failed to clear auth data:', error);
    throw new Error('Failed to clear auth data');
  }
}
