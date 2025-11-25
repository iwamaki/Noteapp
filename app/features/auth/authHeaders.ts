/**
 * @file authHeaders.ts
 * @summary 認証ヘッダー生成ユーティリティ
 * @responsibility 認証ヘッダーを生成する（循環参照を避けるため分離）
 */

import { getAccessToken } from './tokenService';
import { logger } from '../../utils/logger';

/**
 * 認証ヘッダーを取得
 * すべてのAPIリクエストで使用するヘッダーを返す
 * @returns 認証ヘッダー（トークンベース）
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    logger.warn('auth', 'No access token found for auth headers');
    return {
      'Content-Type': 'application/json',
    };
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  };
}
