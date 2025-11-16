/**
 * @file authHeaders.ts
 * @summary 認証ヘッダー生成ユーティリティ
 * @responsibility 認証ヘッダーを生成する（循環参照を避けるため分離）
 */

import { getOrCreateDeviceId } from './deviceIdService';

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
