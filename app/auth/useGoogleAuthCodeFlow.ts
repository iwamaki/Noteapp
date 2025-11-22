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
import { getOrCreateDeviceId } from './deviceIdService';
import { logger } from '../utils/logger';

// WebBrowser セッションの自動終了を有効化（iOS で推奨）
WebBrowser.maybeCompleteAuthSession();

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
    logger.debug('auth', 'Deep link received', { url });

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
        // CSRF保護: state パラメータを検証
        const receivedState = params.get('state');
        const storedState = await SecureStore.getItemAsync('oauth_state');

        if (!receivedState || !storedState) {
          logger.error('auth', 'Missing state parameter - possible CSRF attack');
          setError('Authentication failed: Invalid state parameter');
          setIsLoading(false);
          return;
        }

        if (receivedState !== storedState) {
          logger.error('auth', 'State parameter mismatch - possible CSRF attack', {
            receivedStatePrefix: receivedState.substring(0, 10),
            storedStatePrefix: storedState.substring(0, 10),
          });
          setError('Authentication failed: State validation failed');
          setIsLoading(false);
          return;
        }

        // State検証成功 - one-time useのため削除
        await SecureStore.deleteItemAsync('oauth_state');
        logger.info('auth', 'State parameter validated successfully');

        await SecureStore.setItemAsync('access_token', accessToken);
        await SecureStore.setItemAsync('refresh_token', refreshToken);
        await SecureStore.setItemAsync('user_id', userId);

        logger.info('auth', 'Tokens saved successfully');

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
        logger.error('auth', 'Failed to save tokens', { error: err });
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
      // デバイス ID を取得（UUID v4形式）
      const deviceId = await getOrCreateDeviceId();

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
      const { auth_url, state } = data;

      if (!state) {
        throw new Error('Server did not return state parameter');
      }

      // CSRF保護: stateパラメータをSecureStoreに保存（one-time use）
      await SecureStore.setItemAsync('oauth_state', state);
      logger.info('auth', 'State parameter stored for CSRF protection');

      logger.debug('auth', 'Opening browser for authentication');

      // WebBrowser で認証画面を開く
      // App Links (HTTPS) を使用（Custom URI Schemeはフォールバック）
      const redirectUrl = `${apiBaseUrl}/api/auth/callback`;
      const browserResult = await WebBrowser.openAuthSessionAsync(
        auth_url,
        redirectUrl
      );

      logger.debug('auth', 'Browser result', { type: browserResult.type });

      if (browserResult.type === 'cancel') {
        // ユーザーがキャンセルした場合、保存したstateを削除
        await SecureStore.deleteItemAsync('oauth_state');
        setError('Authentication cancelled');
        setIsLoading(false);
      }

      // 成功時は Deep Link で処理されるため、ここでは何もしない

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      logger.error('auth', 'Login error', { error: errorMessage });
      // エラー時も保存したstateを削除
      try {
        await SecureStore.deleteItemAsync('oauth_state');
      } catch (deleteErr) {
        logger.error('auth', 'Failed to delete state on error', { error: deleteErr });
      }
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
