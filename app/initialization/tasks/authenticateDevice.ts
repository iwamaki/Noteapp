/**
 * @file authenticateDevice.ts
 * @summary デバイスID認証初期化タスク
 * @responsibility アプリ起動時にデバイスIDを登録し、ユーザーアカウントを取得
 */

import { InitializationTask, InitializationStage, TaskPriority } from '../types';
import { getOrCreateDeviceId, saveUserId, getUserId } from '../../auth/deviceIdService';
import { registerDevice, verifyDevice } from '../../auth/authApiClient';
import { saveTokens } from '../../auth/tokenService';
import { logger } from '../../utils/logger';

export const authenticateDevice: InitializationTask = {
  id: 'authenticate_device',
  name: 'デバイス認証',
  description: 'デバイスIDを登録し、ユーザーアカウントを取得します',
  stage: InitializationStage.CRITICAL,
  priority: TaskPriority.CRITICAL,
  timeout: 10000, // 10秒タイムアウト

  execute: async () => {
    try {
      // デバイスIDを取得または生成
      const deviceId = await getOrCreateDeviceId();
      logger.info('auth', 'Device ID obtained', {
        deviceIdPrefix: deviceId.substring(0, 8)
      });

      // 既存のユーザーIDを確認
      const existingUserId = await getUserId();

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
          return;
        } catch (verifyError) {
          // 検証失敗（デバイス未登録など） → 再登録フローに進む
          logger.warn('auth', 'Verification failed, re-registration required', {
            error: verifyError instanceof Error ? verifyError.message : 'Unknown error'
          });
          // 下の登録フローに進む
        }
      }

      // 新規登録またはverify失敗時の登録フロー
      logger.info('auth', 'Registering device with backend');
      const response = await registerDevice(deviceId);
      logger.info('auth', 'Registration successful', {
        message: response.message,
        userIdPrefix: response.user_id.substring(0, 8),
        isNewUser: response.is_new_user
      });

      // ユーザーIDを保存
      await saveUserId(response.user_id);
      logger.info('auth', 'User ID saved successfully');

      // トークンを保存
      await saveTokens(response.access_token, response.refresh_token);
      logger.info('auth', 'Tokens saved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('auth', 'Device authentication failed', { error: errorMessage });
      throw new Error(`Device authentication failed: ${errorMessage}`);
    }
  },
};
