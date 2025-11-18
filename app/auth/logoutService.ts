/**
 * @file logoutService.ts
 * @summary ログアウトサービス
 * @responsibility 完全なログアウトフローを管理（サーバー通知 + ローカルクリア）
 */

import { logger } from '../utils/logger';
import { getAccessToken, getRefreshToken, clearTokens } from './tokenService';
import { logout as logoutApi } from './authApiClient';

/**
 * 完全なログアウト処理を実行
 *
 * フロー:
 * 1. 現在のトークンを取得
 * 2. サーバーにログアウトリクエストを送信（トークンをブラックリストに追加）
 * 3. ローカルストレージからトークンをクリア
 * 4. エラーが発生してもローカルトークンは削除される
 *
 * @returns ログアウト成功フラグ
 */
export async function performLogout(): Promise<boolean> {
  try {
    // 1. 現在のトークンを取得
    const accessToken = await getAccessToken();
    const refreshToken = await getRefreshToken();

    // トークンが存在しない場合は既にログアウト済み
    if (!accessToken || !refreshToken) {
      logger.info('auth', 'Already logged out (no tokens found)');
      return true;
    }

    // 2. サーバーにログアウトリクエストを送信
    try {
      await logoutApi(accessToken, refreshToken);
      logger.info('auth', 'Server logout successful');
    } catch (error) {
      // サーバーエラーでもローカルトークンは削除する
      logger.warn('auth', 'Server logout failed, but clearing local tokens', error);
    }

    // 3. ローカルストレージからトークンをクリア
    await clearTokens();
    logger.info('auth', 'Local tokens cleared');

    return true;
  } catch (error) {
    logger.error('auth', 'Logout failed', error);

    // エラーが発生してもローカルトークンをクリアする
    try {
      await clearTokens();
      logger.info('auth', 'Local tokens cleared after error');
    } catch (clearError) {
      logger.error('auth', 'Failed to clear local tokens', clearError);
    }

    return false;
  }
}

/**
 * ローカルのみのログアウト（サーバー通知なし）
 *
 * ネットワークエラーや緊急時に使用。
 * サーバー側のトークンは無効化されないため、セキュリティリスクがある。
 *
 * @returns ログアウト成功フラグ
 */
export async function performLocalLogout(): Promise<boolean> {
  try {
    await clearTokens();
    logger.info('auth', 'Local-only logout completed');
    return true;
  } catch (error) {
    logger.error('auth', 'Local logout failed', error);
    return false;
  }
}
