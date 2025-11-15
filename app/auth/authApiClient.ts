/**
 * @file authApiClient.ts
 * @summary 認証API クライアント
 * @responsibility バックエンドの認証APIとの通信を管理
 */

import { getOrCreateDeviceId } from './deviceIdService';
import { logger } from '../utils/logger';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// 型定義
export interface DeviceRegisterResponse {
  user_id: string;
  is_new_user: boolean;
  message: string;
}

export interface VerifyDeviceResponse {
  valid: boolean;
  user_id: string;
  message: string;
}

export interface ErrorResponse {
  detail: string;
}

/**
 * 認証ヘッダーを取得
 * すべてのAPIリクエストで使用するヘッダーを返す
 * @returns 認証ヘッダー
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const deviceId = await getOrCreateDeviceId();
  return {
    'Content-Type': 'application/json',
    'X-Device-ID': deviceId,
  };
}

/**
 * デバイスIDを登録し、ユーザーアカウントを作成または取得
 * @param deviceId デバイスID
 * @returns レスポンス
 */
export async function registerDevice(deviceId: string): Promise<DeviceRegisterResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ device_id: deviceId }),
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(error.detail || 'Device registration failed');
    }

    return await response.json();
  } catch (error) {
    logger.error('auth', 'Device registration error', error);
    throw error;
  }
}

/**
 * デバイスIDとユーザーIDの対応関係を検証
 *
 * クライアント側で保持しているuser_idとサーバー側のdevice_idに紐付く
 * user_idが一致しているかを確認する。
 *
 * @param deviceId デバイスID
 * @param userId クライアント側で保持しているユーザーID
 * @returns 検証結果
 */
export async function verifyDevice(
  deviceId: string,
  userId: string
): Promise<VerifyDeviceResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        device_id: deviceId,
        user_id: userId
      }),
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(error.detail || 'Device verification failed');
    }

    return await response.json();
  } catch (error) {
    logger.error('auth', 'Device verification error', error);
    throw error;
  }
}
