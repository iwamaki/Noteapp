/**
 * @file authApiClient.ts
 * @summary 認証API クライアント
 * @responsibility バックエンドの認証APIとの通信を管理
 */

import { getOrCreateDeviceId } from './deviceIdService';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// 型定義
export interface DeviceRegisterResponse {
  user_id: string;
  is_new_user: boolean;
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
    console.error('[AuthAPI] Device registration error:', error);
    throw error;
  }
}
