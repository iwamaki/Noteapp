/**
 * @file googleUserService.ts
 * @description Googleユーザー情報の管理
 *
 * SecureStoreを使用してGoogleアカウント情報を安全に保存・取得します。
 */

import * as SecureStore from 'expo-secure-store';
import { logger } from '../../utils/logger';

// SecureStore のキー
const GOOGLE_USER_EMAIL_KEY = 'google_user_email';
const GOOGLE_USER_NAME_KEY = 'google_user_name';
const GOOGLE_USER_PICTURE_KEY = 'google_user_picture';

/**
 * Googleユーザー情報の型
 */
export interface GoogleUserInfo {
  email: string;
  displayName?: string;
  profilePictureUrl?: string;
}

/**
 * Googleユーザー情報を保存
 *
 * @param userInfo Googleユーザー情報
 */
export async function saveGoogleUserInfo(userInfo: GoogleUserInfo): Promise<void> {
  try {
    await SecureStore.setItemAsync(GOOGLE_USER_EMAIL_KEY, userInfo.email);

    if (userInfo.displayName) {
      await SecureStore.setItemAsync(GOOGLE_USER_NAME_KEY, userInfo.displayName);
    }

    if (userInfo.profilePictureUrl) {
      await SecureStore.setItemAsync(GOOGLE_USER_PICTURE_KEY, userInfo.profilePictureUrl);
    }
  } catch (error) {
    logger.error('auth', 'Failed to save Google user info', { error });
    throw new Error('Failed to save Google user info');
  }
}

/**
 * Googleユーザー情報を取得
 *
 * @returns Googleユーザー情報。保存されていない場合はnull
 */
export async function getGoogleUserInfo(): Promise<GoogleUserInfo | null> {
  try {
    const email = await SecureStore.getItemAsync(GOOGLE_USER_EMAIL_KEY);

    if (!email) {
      return null;
    }

    const displayName = await SecureStore.getItemAsync(GOOGLE_USER_NAME_KEY);
    const profilePictureUrl = await SecureStore.getItemAsync(GOOGLE_USER_PICTURE_KEY);

    return {
      email,
      displayName: displayName || undefined,
      profilePictureUrl: profilePictureUrl || undefined,
    };
  } catch (error) {
    logger.error('auth', 'Failed to get Google user info', { error });
    return null;
  }
}

/**
 * Googleユーザー情報をクリア
 */
export async function clearGoogleUserInfo(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(GOOGLE_USER_EMAIL_KEY),
      SecureStore.deleteItemAsync(GOOGLE_USER_NAME_KEY),
      SecureStore.deleteItemAsync(GOOGLE_USER_PICTURE_KEY),
    ]);
  } catch (error) {
    logger.error('auth', 'Failed to clear Google user info', { error });
    throw new Error('Failed to clear Google user info');
  }
}

/**
 * Googleアカウントでログイン済みかどうかを確認
 *
 * @returns ログイン済みならtrue
 */
export async function isGoogleLoggedIn(): Promise<boolean> {
  const userInfo = await getGoogleUserInfo();
  return userInfo !== null;
}
