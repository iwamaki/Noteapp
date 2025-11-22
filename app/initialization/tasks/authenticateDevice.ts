/**
 * @file authenticateDevice.ts
 * @summary デバイスID認証初期化タスク
 * @responsibility アプリ起動時にデバイスIDを登録し、ユーザーアカウントを取得
 *
 * Note: 認証状態管理はauthStoreに移行されました。
 * このタスクは、authStore未導入のレガシーフローとの互換性を保持しつつ、
 * デバイス認証のコア機能（登録・検証）のみを実行します。
 */

import { InitializationTask, InitializationStage, TaskPriority } from '../types';
import { getOrCreateDeviceId, saveUserId, getUserId } from '../../auth/deviceIdService';
import { registerDevice, verifyDevice } from '../../auth/authApiClient';
import { saveTokens } from '../../auth/tokenService';
import { logger } from '../../utils/logger';
import { useAuthStore } from '../../auth/authStore';

export const authenticateDevice: InitializationTask = {
  id: 'authenticate_device',
  name: 'デバイス認証',
  description: 'デバイスIDを登録し、認証状態を初期化します',
  stage: InitializationStage.CRITICAL,
  priority: TaskPriority.CRITICAL,
  timeout: 7000, // 7秒タイムアウト（最適化: 10秒→7秒）
  retry: {
    maxAttempts: 2, // ネットワークエラー時に1回リトライ
    delayMs: 1000,
  },

  execute: async () => {
    try {
      logger.info('auth', 'Starting device authentication and auth store initialization...');

      // 1. デバイスIDとユーザーIDを並列取得（最適化: 並列化）
      const [deviceId, existingUserId] = await Promise.all([
        getOrCreateDeviceId(),
        getUserId(),
      ]);

      logger.info('auth', 'Device ID obtained', {
        deviceIdPrefix: deviceId.substring(0, 8)
      });

      if (existingUserId) {
        logger.info('auth', 'Existing user ID found', {
          userIdPrefix: existingUserId.substring(0, 8)
        });
        logger.info('auth', 'Verifying device-user relationship with server');

        try {
          // サーバーで検証
          const verifyResult = await verifyDevice(deviceId, existingUserId);

          if (!verifyResult.valid) {
            // 不一致検出 → 正しいuser_idで更新
            logger.warn('auth', 'User ID mismatch detected, updating to server value', {
              clientUserIdPrefix: existingUserId.substring(0, 8),
              serverUserIdPrefix: verifyResult.user_id.substring(0, 8)
            });
            await saveUserId(verifyResult.user_id);
            logger.info('auth', 'User ID synchronized successfully');
          } else {
            // 一致している
            logger.info('auth', 'Verification successful', { message: verifyResult.message });
          }
        } catch (verifyError) {
          // 検証失敗（デバイス未登録など） → 再登録フローに進む
          logger.warn('auth', 'Verification failed, re-registration required', {
            error: verifyError instanceof Error ? verifyError.message : 'Unknown error'
          });

          // 新規登録
          logger.info('auth', 'Registering device with backend');
          const response = await registerDevice(deviceId);
          logger.info('auth', 'Registration successful', {
            message: response.message,
            userIdPrefix: response.user_id.substring(0, 8),
            isNewUser: response.is_new_user
          });

          // ユーザーIDとトークンを並列保存（最適化: 並列化）
          await Promise.all([
            saveUserId(response.user_id),
            saveTokens(response.access_token, response.refresh_token),
          ]);
          logger.info('auth', 'User ID and tokens saved successfully');
        }
      } else {
        // 新規登録フロー
        logger.info('auth', 'No existing user ID, registering device with backend');
        const response = await registerDevice(deviceId);
        logger.info('auth', 'Registration successful', {
          message: response.message,
          userIdPrefix: response.user_id.substring(0, 8),
          isNewUser: response.is_new_user
        });

        // ユーザーIDとトークンを並列保存（最適化: 並列化）
        await Promise.all([
          saveUserId(response.user_id),
          saveTokens(response.access_token, response.refresh_token),
        ]);
        logger.info('auth', 'User ID and tokens saved successfully');
      }

      // 3. 認証ストアを初期化（SecureStoreから状態を復元）
      logger.info('auth', 'Initializing auth store...');
      await useAuthStore.getState().initialize();
      logger.info('auth', 'Auth store initialized successfully');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('auth', 'Device authentication failed', { error: errorMessage });
      throw new Error(`Device authentication failed: ${errorMessage}`);
    }
  },
};
