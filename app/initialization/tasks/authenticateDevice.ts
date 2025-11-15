/**
 * @file authenticateDevice.ts
 * @summary デバイスID認証初期化タスク
 * @responsibility アプリ起動時にデバイスIDを登録し、ユーザーアカウントを取得
 */

import { InitializationTask, InitializationStage, TaskPriority } from '../types';
import { getOrCreateDeviceId, saveUserId, getUserId } from '../../auth/deviceIdService';
import { registerDevice, verifyDevice } from '../../auth/authApiClient';

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
      console.log(`[Auth] Device ID: ${deviceId}`);

      // 既存のユーザーIDを確認
      const existingUserId = await getUserId();

      if (existingUserId) {
        console.log(`[Auth] Existing user ID found: ${existingUserId}`);
        console.log(`[Auth] Verifying device-user relationship with server...`);

        try {
          // サーバーで検証
          const verifyResult = await verifyDevice(deviceId, existingUserId);

          if (!verifyResult.valid) {
            // 不一致検出 → 正しいuser_idで更新
            console.warn(
              `[Auth] User ID mismatch detected!\n` +
              `  Client user_id: ${existingUserId}\n` +
              `  Server user_id: ${verifyResult.user_id}\n` +
              `  Updating to correct user_id...`
            );
            await saveUserId(verifyResult.user_id);
            console.log(`[Auth] User ID updated successfully: ${verifyResult.user_id}`);
          } else {
            // 一致している
            console.log(`[Auth] Verification successful: ${verifyResult.message}`);
          }
          return;
        } catch (verifyError) {
          // 検証失敗（デバイス未登録など） → 再登録フローに進む
          console.warn(
            `[Auth] Verification failed: ${verifyError instanceof Error ? verifyError.message : 'Unknown error'}\n` +
            `  Re-registering device...`
          );
          // 下の登録フローに進む
        }
      }

      // 新規登録またはverify失敗時の登録フロー
      console.log(`[Auth] Registering device with backend...`);
      const response = await registerDevice(deviceId);
      console.log(`[Auth] ${response.message}: ${response.user_id}`);

      // ユーザーIDを保存
      await saveUserId(response.user_id);
      console.log(`[Auth] User ID saved successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Auth] Device authentication failed: ${errorMessage}`);
      throw new Error(`Device authentication failed: ${errorMessage}`);
    }
  },
};
