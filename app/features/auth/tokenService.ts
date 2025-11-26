/**
 * @file tokenService.ts
 * @summary JWTトークン管理サービス
 * @responsibility アクセストークンとリフレッシュトークンの保存・取得・削除
 */

import * as SecureStore from 'expo-secure-store';
import { logger } from '../../utils/logger';
import { isJwtExpired, getJwtTimeToExpiry } from './jwtUtils';

const ACCESS_TOKEN_KEY = 'noteapp_access_token';
const REFRESH_TOKEN_KEY = 'noteapp_refresh_token';

/**
 * アクセストークンを保存
 * @param token アクセストークン
 */
export async function saveAccessToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    logger.debug('auth', 'Access token saved to SecureStore');
  } catch (error) {
    logger.error('auth', 'Failed to save access token', error);
    throw new Error('Failed to save access token');
  }
}

/**
 * リフレッシュトークンを保存
 * @param token リフレッシュトークン
 */
export async function saveRefreshToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    logger.debug('auth', 'Refresh token saved to SecureStore');
  } catch (error) {
    logger.error('auth', 'Failed to save refresh token', error);
    throw new Error('Failed to save refresh token');
  }
}

/**
 * アクセストークンとリフレッシュトークンを保存
 * @param accessToken アクセストークン
 * @param refreshToken リフレッシュトークン
 */
export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    saveAccessToken(accessToken),
    saveRefreshToken(refreshToken),
  ]);
  logger.info('auth', 'Tokens saved successfully');
}

/**
 * アクセストークンを取得
 * @returns アクセストークン（存在しない場合はnull）
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch (error) {
    logger.error('auth', 'Failed to get access token', error);
    return null;
  }
}

/**
 * リフレッシュトークンを取得
 * @returns リフレッシュトークン（存在しない場合はnull）
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    logger.error('auth', 'Failed to get refresh token', error);
    return null;
  }
}

/**
 * すべてのトークンをクリア
 */
export async function clearTokens(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
    logger.info('auth', 'Tokens cleared from SecureStore');
  } catch (error) {
    logger.error('auth', 'Failed to clear tokens', error);
    throw new Error('Failed to clear tokens');
  }
}

/**
 * トークンが存在するか確認
 * @returns トークンが存在する場合はtrue
 */
export async function hasValidTokens(): Promise<boolean> {
  const accessToken = await getAccessToken();
  const refreshToken = await getRefreshToken();
  return !!(accessToken && refreshToken);
}

/**
 * アクセストークンが期限切れかチェック
 * @param bufferSeconds バッファ時間（秒）。この時間前を期限切れとみなす
 * @returns 期限切れの場合true、有効な場合false、トークンがない場合もtrue
 */
export async function isAccessTokenExpired(bufferSeconds: number = 0): Promise<boolean> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return true;
  }
  return isJwtExpired(accessToken, bufferSeconds);
}

/**
 * リフレッシュトークンが期限切れかチェック
 * @param bufferSeconds バッファ時間（秒）。この時間前を期限切れとみなす
 * @returns 期限切れの場合true、有効な場合false、トークンがない場合もtrue
 */
export async function isRefreshTokenExpired(bufferSeconds: number = 0): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return true;
  }
  return isJwtExpired(refreshToken, bufferSeconds);
}

/**
 * アクセストークンの残り有効時間を取得（ミリ秒）
 * @returns 残り時間（ミリ秒）、トークンがない場合は0
 */
export async function getAccessTokenTimeToExpiry(): Promise<number> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return 0;
  }
  return getJwtTimeToExpiry(accessToken);
}
