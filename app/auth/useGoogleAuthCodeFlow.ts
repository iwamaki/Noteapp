/**
 * @file useGoogleAuthCodeFlow.ts
 * @description Google OAuth2 Authorization Code Flow フック
 *
 * バックエンド経由で Google OAuth2 認証を行います。
 */

import { useState, useEffect, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// WebBrowser セッションの自動終了を有効化（iOS で推奨）
WebBrowser.maybeCompleteAuthSession();

/**
 * デバイス ID を取得
 */
async function getDeviceId(): Promise<string> {
  const KEY = 'device_id';

  // 既存のデバイス ID を取得
  let deviceId = await SecureStore.getItemAsync(KEY);

  if (!deviceId) {
    // 新しいデバイス ID を生成
    deviceId = `${Platform.OS}_${Constants.deviceId || 'unknown'}_${Date.now()}`;
    await SecureStore.setItemAsync(KEY, deviceId);
  }

  return deviceId;
}

/**
 * Google OAuth2 認証結果の型
 */
export interface GoogleAuthResult {
  access_token: string;
  refresh_token: string;
  user_id: string;
  is_new_user: boolean;
  email: string;
  display_name?: string;
  profile_picture_url?: string;
}

/**
 * Google OAuth2 Authorization Code Flow フックの戻り値
 */
export interface UseGoogleAuthCodeFlowResult {
  /**
   * Google 認証を開始する関数
   */
  login: () => Promise<void>;

  /**
   * 認証結果
   */
  result: GoogleAuthResult | null;

  /**
   * 認証中かどうか
   */
  isLoading: boolean;

  /**
   * エラーメッセージ
   */
  error: string | null;
}

/**
 * API ベース URL を取得
 */
function getApiBaseUrl(): string {
  return process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';
}

/**
 * Google OAuth2 Authorization Code Flow フック
 *
 * @example
 * ```tsx
 * const { login, result, isLoading, error } = useGoogleAuthCodeFlow();
 *
 * // ログインボタンのハンドラー
 * const handleGoogleLogin = async () => {
 *   await login();
 *   if (result) {
 *     // 認証成功
 *     console.log('User ID:', result.user_id);
 *   }
 * };
 * ```
 */
export function useGoogleAuthCodeFlow(): UseGoogleAuthCodeFlowResult {
  const [result, setResult] = useState<GoogleAuthResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deep Link を監視
  useEffect(() => {
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // 初回起動時の URL を確認
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  /**
   * Deep Link を処理（Custom URI Scheme & App Links 両対応）
   */
  const handleDeepLink = useCallback((url: string) => {
    console.log('[GoogleAuth] Deep link received:', url);

    // Custom URI Scheme (noteapp://auth?...) または
    // App Links (https://99f150da2530.ngrok-free.app/auth/callback?...) の形式かチェック
    const isCustomScheme = url.startsWith('noteapp://auth');
    const isAppLink = url.includes('/auth/callback');

    if (!isCustomScheme && !isAppLink) {
      return;
    }

    // WebBrowser を閉じる（Deep Link を受け取ったので）
    WebBrowser.dismissBrowser();

    // URL パラメータをパース
    let params: URLSearchParams;
    if (isCustomScheme) {
      // Custom URI Scheme: noteapp://auth?... → https://noteapp.app/auth?...
      params = new URL(url.replace('noteapp://', 'https://noteapp.app/')).searchParams;
    } else {
      // App Links: https://99f150da2530.ngrok-free.app/auth/callback?...
      params = new URL(url).searchParams;
    }

    // エラーチェック
    const errorParam = params.get('error');
    if (errorParam) {
      setError(`Authentication failed: ${errorParam}`);
      setIsLoading(false);
      return;
    }

    // トークンを取得
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const userId = params.get('user_id');
    const isNewUser = params.get('is_new_user') === 'true';
    const email = params.get('email');
    const displayName = params.get('display_name');
    const profilePictureUrl = params.get('profile_picture_url');

    if (!accessToken || !refreshToken || !userId || !email) {
      setError('Missing required parameters in callback');
      setIsLoading(false);
      return;
    }

    // トークンを SecureStore に保存
    (async () => {
      try {
        await SecureStore.setItemAsync('access_token', accessToken);
        await SecureStore.setItemAsync('refresh_token', refreshToken);
        await SecureStore.setItemAsync('user_id', userId);

        console.log('[GoogleAuth] Tokens saved successfully');

        // 認証結果を設定
        setResult({
          access_token: accessToken,
          refresh_token: refreshToken,
          user_id: userId,
          is_new_user: isNewUser,
          email,
          display_name: displayName || undefined,
          profile_picture_url: profilePictureUrl || undefined,
        });

        setIsLoading(false);
        setError(null);
      } catch (err) {
        console.error('[GoogleAuth] Failed to save tokens:', err);
        setError('Failed to save authentication tokens');
        setIsLoading(false);
      }
    })();
  }, []);

  /**
   * Google 認証を開始
   */
  const login = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // デバイス ID を取得
      const deviceId = await getDeviceId();

      // バックエンドに認証開始リクエスト
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/auth/google/auth-start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ device_id: deviceId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start auth: ${response.statusText}`);
      }

      const data = await response.json();
      const { auth_url } = data;

      console.log('[GoogleAuth] Opening browser for authentication...');

      // WebBrowser で認証画面を開く
      // App Links (HTTPS) を使用（Custom URI Schemeはフォールバック）
      const redirectUrl = `${apiBaseUrl}/auth/callback`;
      const browserResult = await WebBrowser.openAuthSessionAsync(
        auth_url,
        redirectUrl
      );

      console.log('[GoogleAuth] Browser result:', browserResult.type);

      if (browserResult.type === 'cancel') {
        setError('Authentication cancelled');
        setIsLoading(false);
      }

      // 成功時は Deep Link で処理されるため、ここでは何もしない

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('[GoogleAuth] Login error:', errorMessage);
      setError(errorMessage);
      setIsLoading(false);
    }
  }, []);

  return {
    login,
    result,
    isLoading,
    error,
  };
}
