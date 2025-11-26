/**
 * @file authApiClient.ts
 * @summary 認証API クライアント
 * @responsibility バックエンドの認証APIとの通信を管理
 */

import { logger } from '../../utils/logger';

// Re-export getAuthHeaders for backward compatibility
export { getAuthHeaders } from './authHeaders';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

/**
 * authClient を遅延初期化（循環参照を避けるため）
 */
let authClient: any = null;
function getAuthClient(): any {
  if (!authClient) {
    // 初回アクセス時にインポート（モジュール初期化後）
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createHttpClient } = require('../api');
    authClient = createHttpClient({
      baseUrl: API_BASE_URL,
      timeout: 10000,
      includeAuth: false,
      logContext: 'auth',
    });
  }
  return authClient;
}

// 型定義
export interface DeviceRegisterResponse {
  user_id: string;
  is_new_user: boolean;
  message: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface VerifyDeviceResponse {
  valid: boolean;
  user_id: string;
  message: string;
}

export interface ErrorResponse {
  detail: string;
}

export interface LogoutResponse {
  message: string;
  success: boolean;
}

/**
 * デバイスIDを登録し、ユーザーアカウントを作成または取得
 * @param deviceId デバイスID
 * @returns レスポンス
 */
export async function registerDevice(deviceId: string): Promise<DeviceRegisterResponse> {
  try {
    const client = getAuthClient();
    const response = await client.post('/api/auth/register', {
      device_id: deviceId,
    });

    return response.data;
  } catch (error) {
    logger.error('auth', 'Device registration error', error);
    throw new Error((error as any).message || 'Device registration failed');
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
    const client = getAuthClient();
    const response = await client.post('/api/auth/verify', {
      device_id: deviceId,
      user_id: userId,
    });

    return response.data;
  } catch (error) {
    logger.error('auth', 'Device verification error', error);
    throw new Error((error as any).message || 'Device verification failed');
  }
}

/**
 * リフレッシュトークンを使用して新しいアクセストークンを取得
 * @param refreshToken リフレッシュトークン
 * @returns 新しいトークン
 */
export async function refreshAccessToken(refreshToken: string): Promise<RefreshTokenResponse> {
  try {
    const client = getAuthClient();
    const response = await client.post('/api/auth/refresh', {
      refresh_token: refreshToken,
    });

    return response.data;
  } catch (error) {
    logger.error('auth', 'Token refresh error', error);
    throw new Error((error as any).message || 'Token refresh failed');
  }
}

/**
 * ログアウトしてトークンを無効化
 * @param accessToken 無効化するアクセストークン
 * @param refreshToken 無効化するリフレッシュトークン
 * @returns ログアウト結果
 */
export async function logout(accessToken: string, refreshToken: string): Promise<LogoutResponse> {
  try {
    const client = getAuthClient();
    const response = await client.post('/api/auth/logout', {
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    logger.info('auth', 'User logged out successfully');
    return response.data;
  } catch (error) {
    logger.error('auth', 'Logout error', error);
    throw new Error((error as any).message || 'Logout failed');
  }
}
