/**
 * @file jwtUtils.ts
 * @summary JWT トークン関連のユーティリティ
 * @responsibility JWTのデコード、有効期限チェック
 */

import { logger } from '../utils/logger';

/**
 * JWTペイロード型定義
 */
export interface JwtPayload {
  exp?: number; // 有効期限（Unix timestamp）
  iat?: number; // 発行時刻（Unix timestamp）
  sub?: string; // Subject（通常はユーザーID）
  [key: string]: any; // その他のクレーム
}

/**
 * JWTトークンをデコードしてペイロードを取得
 * @param token JWTトークン
 * @returns デコードされたペイロード、失敗時はnull
 */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    // JWTは "header.payload.signature" の形式
    const parts = token.split('.');
    if (parts.length !== 3) {
      logger.warn('jwt', 'Invalid JWT format: expected 3 parts');
      return null;
    }

    // ペイロード部分（2番目）をBase64デコード
    const payload = parts[1];

    // URLセーフなBase64をデコード（パディング追加）
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');

    // Base64デコード
    const jsonPayload = atob(paddedBase64);

    // JSONパース
    const decoded: JwtPayload = JSON.parse(jsonPayload);

    return decoded;
  } catch (error) {
    logger.error('jwt', 'Failed to decode JWT', error);
    return null;
  }
}

/**
 * JWTトークンの有効期限を取得（Unix timestamp）
 * @param token JWTトークン
 * @returns 有効期限（秒単位のUnix timestamp）、取得失敗時はnull
 */
export function getJwtExpiration(token: string): number | null {
  const payload = decodeJwt(token);
  if (!payload || !payload.exp) {
    logger.warn('jwt', 'JWT has no expiration claim');
    return null;
  }
  return payload.exp;
}

/**
 * JWTトークンが期限切れかどうかをチェック
 * @param token JWTトークン
 * @param bufferSeconds バッファ時間（秒）。この時間前を期限切れとみなす（デフォルト: 0）
 * @returns 期限切れの場合true、まだ有効な場合false
 */
export function isJwtExpired(token: string, bufferSeconds: number = 0): boolean {
  const exp = getJwtExpiration(token);
  if (exp === null) {
    // 有効期限が取得できない場合は期限切れとみなす
    return true;
  }

  const now = Math.floor(Date.now() / 1000); // 現在時刻（秒）
  const expiresAt = exp - bufferSeconds;

  return now >= expiresAt;
}

/**
 * JWTトークンの残り有効時間を取得（ミリ秒）
 * @param token JWTトークン
 * @returns 残り時間（ミリ秒）、期限切れまたは取得失敗時は0
 */
export function getJwtTimeToExpiry(token: string): number {
  const exp = getJwtExpiration(token);
  if (exp === null) {
    return 0;
  }

  const now = Math.floor(Date.now() / 1000); // 現在時刻（秒）
  const remainingSeconds = exp - now;

  if (remainingSeconds <= 0) {
    return 0;
  }

  return remainingSeconds * 1000; // ミリ秒に変換
}

/**
 * JWTトークンの期限切れまでの時間を人間が読める形式で取得
 * @param token JWTトークン
 * @returns 例: "25分30秒"、期限切れの場合は "期限切れ"
 */
export function getJwtExpiryDescription(token: string): string {
  const timeToExpiry = getJwtTimeToExpiry(token);

  if (timeToExpiry <= 0) {
    return '期限切れ';
  }

  const totalSeconds = Math.floor(timeToExpiry / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}分${seconds}秒`;
  }
  return `${seconds}秒`;
}
