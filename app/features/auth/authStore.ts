/**
 * @file authStore.ts
 * @summary 認証状態管理ストア
 * @responsibility アプリケーション全体の認証状態を集中管理し、一貫した認証フローを提供
 *
 * 設計思想:
 * - 認証関連の状態を単一のストアに集約
 * - コンポーネントは useAuth() フックで統一アクセス
 * - 既存のサービス層（tokenService, deviceIdService等）を活用
 * - settingsStore.ts と同じZustandパターンを踏襲
 */

import { create } from 'zustand';
import { AppState, AppStateStatus } from 'react-native';
import { logger } from '../../utils/logger';

// 既存のサービスをインポート
import {
  getRefreshToken,
  saveTokens,
  hasValidTokens,
  isAccessTokenExpired,
  isRefreshTokenExpired,
  getAccessTokenTimeToExpiry,
  clearTokens,
} from './tokenService';
import {
  getOrCreateDeviceId,
  getUserId,
  saveUserId,
} from './deviceIdService';
import {
  getGoogleUserInfo,
  saveGoogleUserInfo,
  clearGoogleUserInfo,
  GoogleUserInfo,
} from './googleUserService';
import { performLogout } from './logoutService';
import { refreshAccessToken } from './authApiClient';

// ======================
// 定数
// ======================

/** トークンリフレッシュのバッファ時間（秒）- 期限の5分前にリフレッシュ */
const TOKEN_REFRESH_BUFFER_SECONDS = 5 * 60;

/** 最小リフレッシュ間隔（ミリ秒）- 1分 */
const MIN_REFRESH_INTERVAL_MS = 60 * 1000;

// ======================
// モジュールレベル変数
// ======================

/** トークンリフレッシュタイマーID */
let tokenRefreshTimerId: ReturnType<typeof setTimeout> | null = null;

/** AppState変更リスナーのサブスクリプション */
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

/**
 * 認証ストアの状態型定義
 */
interface AuthState {
  // ========== 状態 ==========

  /**
   * 認証済みかどうか
   * トークンとユーザーIDが存在する場合にtrue
   */
  isAuthenticated: boolean;

  /**
   * 初期化中かどうか
   * アプリ起動時の認証状態チェック中にtrue
   */
  isInitializing: boolean;

  /**
   * Googleログイン処理中かどうか
   */
  isLoggingIn: boolean;

  /**
   * ログアウト処理中かどうか
   */
  isLoggingOut: boolean;

  /**
   * デバイスID (UUID v4形式)
   */
  deviceId: string | null;

  /**
   * ユーザーID
   */
  userId: string | null;

  /**
   * Googleユーザー情報
   * Google OAuth2でログインしている場合のみ存在
   */
  googleUser: GoogleUserInfo | null;

  /**
   * エラーメッセージ
   */
  error: string | null;

  // ========== アクション ==========

  /**
   * 認証状態を初期化
   * アプリ起動時に呼び出され、SecureStoreから状態を復元
   */
  initialize: () => Promise<void>;

  /**
   * Googleログインを開始
   * useGoogleAuthCodeFlowを使用してOAuth2フローを実行
   *
   * @returns ログイン成功時にtrue
   */
  loginWithGoogle: () => Promise<boolean>;

  /**
   * Google認証結果を処理
   * useGoogleAuthCodeFlowのコールバックで使用
   *
   * @param authResult OAuth2認証結果
   */
  handleGoogleAuthResult: (authResult: GoogleAuthResult) => Promise<void>;

  /**
   * ログアウト
   * サーバーにトークン無効化を通知し、ローカル状態をクリア
   */
  logout: () => Promise<void>;

  /**
   * トークンをリフレッシュ
   * リフレッシュトークンを使用して新しいアクセストークンを取得
   *
   * @returns リフレッシュ成功時にtrue
   */
  refreshTokens: () => Promise<boolean>;

  /**
   * 認証状態を確認
   * トークンの有効性をチェックし、必要に応じてリフレッシュ
   *
   * @returns 認証状態が有効な場合にtrue
   */
  checkAuthStatus: () => Promise<boolean>;

  /**
   * エラーをクリア
   */
  clearError: () => void;

  /**
   * プロアクティブなトークンリフレッシュタイマーをセットアップ
   * アクセストークンの期限が切れる前に自動リフレッシュ
   */
  setupTokenRefreshTimer: () => Promise<void>;

  /**
   * AppState変更リスナーをセットアップ
   * フォアグラウンド復帰時にトークン状態をチェック
   */
  setupAppStateListener: () => void;

  /**
   * クリーンアップ（タイマーとリスナーを解除）
   */
  cleanup: () => void;
}

/**
 * Google OAuth2認証結果の型
 * useGoogleAuthCodeFlowから渡される
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
 * 認証ストア
 *
 * 使用例:
 * ```tsx
 * const { isAuthenticated, loginWithGoogle, logout } = useAuthStore();
 *
 * // ログイン
 * await loginWithGoogle();
 *
 * // ログアウト
 * await logout();
 * ```
 */
export const useAuthStore = create<AuthState>((set) => ({
  // ========== 初期状態 ==========
  isAuthenticated: false,
  isInitializing: true,
  isLoggingIn: false,
  isLoggingOut: false,
  deviceId: null,
  userId: null,
  googleUser: null,
  error: null,

  // ========== アクション実装 ==========

  /**
   * 認証状態を初期化
   * アプリ起動時に SecureStore から状態を復元
   * トークンの有効期限もチェックし、期限切れの場合はリフレッシュを試みる
   */
  initialize: async () => {
    logger.info('auth', 'Initializing auth store...');
    set({ isInitializing: true, error: null });

    try {
      // 1. デバイスIDを取得（存在しない場合は生成）
      const deviceId = await getOrCreateDeviceId();

      // 2. ユーザーIDを取得
      const userId = await getUserId();

      // 3. Googleユーザー情報を取得
      const googleUser = await getGoogleUserInfo();

      // 4. トークンの有無を確認
      const hasTokens = await hasValidTokens();

      // 5. トークンの有効期限をチェック
      let isAuthenticated = false;

      if (hasTokens && userId && googleUser) {
        // リフレッシュトークンが期限切れの場合はログアウト状態にする
        const refreshExpired = await isRefreshTokenExpired();
        if (refreshExpired) {
          logger.warn('auth', 'Refresh token expired, clearing tokens');
          await clearTokens();
          await clearGoogleUserInfo();
          isAuthenticated = false;
        } else {
          // アクセストークンが期限切れの場合はリフレッシュを試みる
          const accessExpired = await isAccessTokenExpired();
          if (accessExpired) {
            logger.info('auth', 'Access token expired, attempting refresh...');
            try {
              const refreshToken = await getRefreshToken();
              if (refreshToken) {
                const response = await refreshAccessToken(refreshToken);
                await saveTokens(response.access_token, response.refresh_token);
                logger.info('auth', 'Token refreshed successfully during initialization');
                isAuthenticated = true;
              }
            } catch (refreshError) {
              logger.error('auth', 'Token refresh failed during initialization', refreshError);
              await clearTokens();
              await clearGoogleUserInfo();
              isAuthenticated = false;
            }
          } else {
            // トークンは有効
            isAuthenticated = true;
          }
        }
      }

      // 6. 状態を更新
      set({
        deviceId,
        userId: isAuthenticated ? userId : null,
        googleUser: isAuthenticated ? googleUser : null,
        isAuthenticated,
        isInitializing: false,
      });

      logger.info('auth', 'Auth store initialized', {
        isAuthenticated,
        hasGoogleUser: !!googleUser,
        deviceIdPrefix: deviceId.substring(0, 8),
        userIdPrefix: userId?.substring(0, 8) || 'none',
      });

      // 7. 認証済みの場合、プロアクティブリフレッシュとAppStateリスナーをセットアップ
      if (isAuthenticated) {
        const store = useAuthStore.getState();
        await store.setupTokenRefreshTimer();
        store.setupAppStateListener();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('auth', 'Failed to initialize auth store', error);

      set({
        error: errorMessage,
        isInitializing: false,
        isAuthenticated: false,
      });
    }
  },

  /**
   * Googleログインを開始
   *
   * Note: この関数は OAuth2 フローを開始するだけで、
   * 実際の認証結果は handleGoogleAuthResult() で処理される
   */
  loginWithGoogle: async () => {
    logger.info('auth', 'Starting Google login flow...');
    set({ isLoggingIn: true, error: null });

    try {
      // useGoogleAuthCodeFlow の login() を外部から呼び出す必要がある
      // この関数は主にローディング状態の管理を行う
      // 実際のOAuth2フローはコンポーネント側で useGoogleAuthCodeFlow を使用

      logger.warn('auth', 'loginWithGoogle() should be called from component using useGoogleAuthCodeFlow');
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('auth', 'Google login failed', error);

      set({
        error: errorMessage,
        isLoggingIn: false,
      });

      return false;
    }
  },

  /**
   * Google認証結果を処理
   * useGoogleAuthCodeFlowのコールバックから呼び出される
   */
  handleGoogleAuthResult: async (authResult: GoogleAuthResult) => {
    logger.info('auth', 'Handling Google auth result...');
    set({ isLoggingIn: true, error: null });

    try {
      // 1. トークンを保存
      await saveTokens(authResult.access_token, authResult.refresh_token);

      // 2. ユーザーIDを保存
      await saveUserId(authResult.user_id);

      // 3. Googleユーザー情報を保存
      const googleUserInfo: GoogleUserInfo = {
        email: authResult.email,
        displayName: authResult.display_name,
        profilePictureUrl: authResult.profile_picture_url,
      };
      await saveGoogleUserInfo(googleUserInfo);

      // 4. 状態を更新
      set({
        userId: authResult.user_id,
        googleUser: googleUserInfo,
        isAuthenticated: true,
        isLoggingIn: false,
        error: null,
      });

      logger.info('auth', 'Google auth result handled successfully', {
        userIdPrefix: authResult.user_id.substring(0, 8),
        isNewUser: authResult.is_new_user,
      });

      // 5. settingsStoreに認証状態変更を通知（トークン残高を新アカウントから取得）
      try {
        const { useTokenBalanceStore } = await import('../settings/settingsStore');
        await useTokenBalanceStore.getState().handleAuthenticationChange(authResult.user_id);
        logger.info('auth', 'Settings synchronized for new account');
      } catch (settingsError) {
        // 設定同期失敗はログインを失敗させない
        logger.warn('auth', 'Failed to synchronize settings after login', settingsError);
      }

      // 6. プロアクティブリフレッシュとAppStateリスナーをセットアップ
      const store = useAuthStore.getState();
      await store.setupTokenRefreshTimer();
      store.setupAppStateListener();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('auth', 'Failed to handle Google auth result', error);

      set({
        error: errorMessage,
        isLoggingIn: false,
        isAuthenticated: false,
      });

      throw error;
    }
  },

  /**
   * ログアウト
   * サーバーにトークン無効化を通知し、ローカル状態をクリア
   */
  logout: async () => {
    logger.info('auth', 'Starting logout...');
    set({ isLoggingOut: true, error: null });

    try {
      // 0. タイマーとリスナーをクリーンアップ
      useAuthStore.getState().cleanup();

      // 1. サーバーにログアウトを通知してトークンを無効化
      await performLogout();

      // 2. Googleユーザー情報をクリア
      await clearGoogleUserInfo();

      // 3. settingsStoreに認証状態変更を通知（トークン残高をクリア）
      try {
        const { useTokenBalanceStore } = await import('../settings/settingsStore');
        await useTokenBalanceStore.getState().handleAuthenticationChange(null);
        logger.info('auth', 'Settings cleared after logout');
      } catch (settingsError) {
        // 設定クリア失敗は警告のみ（ログアウト自体は失敗させない）
        logger.warn('auth', 'Failed to clear settings after logout', settingsError);
      }

      // 4. 状態をリセット
      set({
        isAuthenticated: false,
        isLoggingOut: false,
        userId: null,
        googleUser: null,
        error: null,
      });

      logger.info('auth', 'Logout completed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('auth', 'Logout failed', error);

      // エラーが発生してもログアウト状態にする（安全側に倒す）
      set({
        isAuthenticated: false,
        isLoggingOut: false,
        userId: null,
        googleUser: null,
        error: errorMessage,
      });
    }
  },

  /**
   * トークンをリフレッシュ
   * リフレッシュトークンを使用して新しいアクセストークンを取得
   */
  refreshTokens: async () => {
    logger.info('auth', 'Refreshing tokens...');

    try {
      // 1. リフレッシュトークンを取得
      const refreshToken = await getRefreshToken();

      if (!refreshToken) {
        logger.warn('auth', 'No refresh token found');
        return false;
      }

      // 2. 新しいトークンを取得
      const response = await refreshAccessToken(refreshToken);

      // 3. 新しいトークンを保存
      await saveTokens(response.access_token, response.refresh_token);

      logger.info('auth', 'Tokens refreshed successfully');
      return true;
    } catch (error) {
      logger.error('auth', 'Failed to refresh tokens', error);

      // リフレッシュ失敗時はトークンをクリアしてログアウト状態にする
      await clearTokens();
      await clearGoogleUserInfo();

      set({
        isAuthenticated: false,
        userId: null,
        googleUser: null,
        error: 'Token refresh failed',
      });

      return false;
    }
  },

  /**
   * 認証状態を確認
   * トークンの有効性をチェックし、必要に応じてリフレッシュ
   */
  checkAuthStatus: async () => {
    logger.debug('auth', 'Checking auth status...');

    try {
      // 1. トークンの有無を確認
      const hasTokens = await hasValidTokens();

      if (!hasTokens) {
        logger.info('auth', 'No valid tokens found');
        set({ isAuthenticated: false });
        return false;
      }

      // 2. ユーザーIDの有無を確認
      const userId = await getUserId();

      if (!userId) {
        logger.warn('auth', 'Tokens exist but no user ID found');
        set({ isAuthenticated: false });
        return false;
      }

      // 3. 認証状態を更新
      set({ isAuthenticated: true, userId });

      logger.debug('auth', 'Auth status check passed');
      return true;
    } catch (error) {
      logger.error('auth', 'Auth status check failed', error);
      set({ isAuthenticated: false });
      return false;
    }
  },

  /**
   * エラーをクリア
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * プロアクティブなトークンリフレッシュタイマーをセットアップ
   * アクセストークンの期限が切れる5分前に自動リフレッシュ
   */
  setupTokenRefreshTimer: async () => {
    // 既存のタイマーをクリア
    if (tokenRefreshTimerId) {
      clearTimeout(tokenRefreshTimerId);
      tokenRefreshTimerId = null;
    }

    try {
      const timeToExpiry = await getAccessTokenTimeToExpiry();

      if (timeToExpiry <= 0) {
        logger.debug('auth', 'Token already expired, skipping timer setup');
        return;
      }

      // リフレッシュタイミング = 期限の5分前
      // ただし最小1分間隔を保証
      const refreshInMs = Math.max(
        timeToExpiry - TOKEN_REFRESH_BUFFER_SECONDS * 1000,
        MIN_REFRESH_INTERVAL_MS
      );

      logger.info('auth', `Token refresh timer set for ${Math.round(refreshInMs / 1000 / 60)} minutes`);

      tokenRefreshTimerId = setTimeout(async () => {
        logger.info('auth', 'Proactive token refresh triggered');
        const store = useAuthStore.getState();
        const success = await store.refreshTokens();

        if (success) {
          // リフレッシュ成功したら次のタイマーをセット
          await store.setupTokenRefreshTimer();
        } else {
          // リフレッシュ失敗したらログアウト状態にする
          logger.warn('auth', 'Proactive token refresh failed');
          set({ isAuthenticated: false });
        }
      }, refreshInMs);
    } catch (error) {
      logger.error('auth', 'Failed to setup token refresh timer', error);
    }
  },

  /**
   * AppState変更リスナーをセットアップ
   * フォアグラウンド復帰時にトークン状態をチェック
   */
  setupAppStateListener: () => {
    // 既存のリスナーを解除
    if (appStateSubscription) {
      appStateSubscription.remove();
      appStateSubscription = null;
    }

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        logger.debug('auth', 'App returned to foreground, checking token status');

        const store = useAuthStore.getState();
        if (!store.isAuthenticated) {
          return;
        }

        try {
          // リフレッシュトークンが期限切れならログアウト
          const refreshExpired = await isRefreshTokenExpired();
          if (refreshExpired) {
            logger.warn('auth', 'Refresh token expired while app was in background');
            await store.logout();
            return;
          }

          // アクセストークンが期限切れならリフレッシュ
          const accessExpired = await isAccessTokenExpired();
          if (accessExpired) {
            logger.info('auth', 'Access token expired while app was in background, refreshing...');
            const success = await store.refreshTokens();
            if (!success) {
              logger.warn('auth', 'Token refresh failed on foreground');
              await store.logout();
              return;
            }
          }

          // タイマーを再セットアップ
          await store.setupTokenRefreshTimer();
        } catch (error) {
          logger.error('auth', 'Error checking token status on foreground', error);
        }
      }
    };

    appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    logger.debug('auth', 'AppState listener set up');
  },

  /**
   * クリーンアップ（タイマーとリスナーを解除）
   */
  cleanup: () => {
    if (tokenRefreshTimerId) {
      clearTimeout(tokenRefreshTimerId);
      tokenRefreshTimerId = null;
      logger.debug('auth', 'Token refresh timer cleared');
    }

    if (appStateSubscription) {
      appStateSubscription.remove();
      appStateSubscription = null;
      logger.debug('auth', 'AppState listener removed');
    }
  },
}));

/**
 * 認証フック
 * コンポーネントから認証ストアにアクセスするための便利フック
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isAuthenticated, loginWithGoogle, logout } = useAuth();
 *
 *   return (
 *     <View>
 *       {isAuthenticated ? (
 *         <Button title="Logout" onPress={logout} />
 *       ) : (
 *         <Button title="Login with Google" onPress={loginWithGoogle} />
 *       )}
 *     </View>
 *   );
 * }
 * ```
 */
export const useAuth = useAuthStore;
