/**
 * @file googleOAuthService.ts
 * @description Google OAuth2認証サービス
 *
 * Expo Auth Sessionを使用してGoogle OAuth2フローを実装します。
 */

import { useEffect, useState } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

// WebBrowserセッションの自動終了を有効化（iOSで推奨）
WebBrowser.maybeCompleteAuthSession();

/**
 * Google OAuth2の設定
 */
const GOOGLE_OAUTH_CONFIG = {
  // Android用Client ID（環境変数から取得）
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || '',
  // iOS用Client ID（環境変数から取得）
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || '',
  // Web/Expo Go用Client ID（環境変数から取得）
  expoClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_EXPO || '',
  // スコープ（profile, emailを要求）
  scopes: ['profile', 'email'],
  // OAuth2エンドポイント
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

/**
 * プラットフォームに応じたGoogle Client IDを取得
 */
function getGoogleClientId(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Platform } = require('react-native');

  switch (Platform.OS) {
    case 'android':
      return GOOGLE_OAUTH_CONFIG.androidClientId;
    case 'ios':
      return GOOGLE_OAUTH_CONFIG.iosClientId;
    default:
      // Expo Goまたはその他のプラットフォーム
      return GOOGLE_OAUTH_CONFIG.expoClientId;
  }
}

/**
 * Google OAuth2認証フックの戻り値の型
 */
export interface UseGoogleAuthResult {
  /**
   * Google認証を開始する関数
   */
  promptAsync: () => Promise<void>;

  /**
   * Google ID Token（認証成功時に取得）
   */
  idToken: string | null;

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
 * Google OAuth2認証フック
 *
 * @example
 * ```tsx
 * const { promptAsync, idToken, isLoading, error } = useGoogleAuth();
 *
 * // ログインボタンのハンドラー
 * const handleGoogleLogin = async () => {
 *   await promptAsync();
 *   if (idToken) {
 *     // バックエンドにIDトークンを送信
 *     await loginWithGoogle(idToken);
 *   }
 * };
 * ```
 */
export function useGoogleAuth(): UseGoogleAuthResult {
  const [idToken, setIdToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // リダイレクトURIを作成
  // Android用: 逆順Client ID形式を使用（AndroidManifest.xmlと一致させる）
  const clientId = getGoogleClientId();
  const clientIdPrefix = clientId.split('-')[0]; // 461522030982
  const redirectUri = `com.googleusercontent.apps.${clientIdPrefix}:/oauth2redirect`;

  // Google OAuth2リクエストを作成
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: getGoogleClientId(),
      scopes: GOOGLE_OAUTH_CONFIG.scopes,
      redirectUri,
      responseType: AuthSession.ResponseType.IdToken,
      // PKCEを無効化（Implicit FlowではPKCEは使えない）
      usePKCE: false,
      // Google OAuth2のパラメータ
      extraParams: {
        // オフライン アクセスを要求しない（ID Tokenのみで十分）
        access_type: 'online',
        // 常にアカウント選択画面を表示
        prompt: 'select_account',
      },
    },
    {
      authorizationEndpoint: GOOGLE_OAUTH_CONFIG.authorizationEndpoint,
    }
  );

  // OAuth2レスポンスを処理
  useEffect(() => {
    if (response?.type === 'success') {
      // 認証成功 - ID Tokenを取得
      const { id_token } = response.params;

      if (id_token) {
        setIdToken(id_token);
        setIsLoading(false);
        setError(null);
      } else {
        setError('ID Token not found in response');
        setIsLoading(false);
      }
    } else if (response?.type === 'error') {
      // 認証エラー
      const errorMessage =
        response.error?.message || 'Google authentication failed';
      setError(errorMessage);
      setIsLoading(false);
      console.error('Google OAuth error:', response.error);
    } else if (response?.type === 'cancel') {
      // ユーザーがキャンセル
      setError('Authentication cancelled');
      setIsLoading(false);
    }
  }, [response]);

  // プロンプト表示関数
  const handlePromptAsync = async () => {
    if (!request) {
      setError('OAuth request not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);
    setIdToken(null);

    try {
      await promptAsync();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return {
    promptAsync: handlePromptAsync,
    idToken,
    isLoading,
    error,
  };
}

/**
 * Google OAuth2 ID Tokenをリセット（ログアウト用）
 *
 * 注意: これはローカルのID Tokenをクリアするだけです。
 * Googleアカウントからのログアウトは行いません。
 */
export function resetGoogleAuth(): void {
  // 現在のところ、useGoogleAuth内で状態管理しているため、
  // この関数は参照用に定義されていますが、
  // 実際のリセットはコンポーネント側で新しいインスタンスを作成するか、
  // useGoogleAuthフック内でリセット関数を公開する必要があります。
  console.log('Google auth reset');
}
