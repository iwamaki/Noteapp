/**
 * @file authenticateDevice.ts
 * @summary デバイスID認証初期化タスク
 * @responsibility アプリ起動時にデバイスIDを登録し、ユーザーアカウントを取得
 */

import { InitializationTask, InitializationStage, TaskPriority } from '../types';
import { getOrCreateDeviceId, saveUserId, getUserId } from '../../auth/deviceIdService';
import { registerDevice } from '../../auth/authApiClient';

export const authenticateDevice: InitializationTask = {
  id: 'authenticate_device',
  name: 'デバイス認証',
  description: 'デバイスIDを登録し、ユーザーアカウントを取得します',
  stage: InitializationStage.CRITICAL,
  priority: TaskPriority.CRITICAL,
  timeout: 10000, // 10秒タイムアウト

  execute: async () => {
    try {
      // 既存のユーザーIDを確認
      const existingUserId = await getUserId();
      if (existingUserId) {
        console.log(`[Auth] Existing user found: ${existingUserId}`);
        return;
      }

      // デバイスIDを取得または生成
      const deviceId = await getOrCreateDeviceId();
      console.log(`[Auth] Device ID: ${deviceId}`);

      // バックエンドに登録
      const response = await registerDevice(deviceId);
      console.log(`[Auth] ${response.message}: ${response.user_id}`);

      // ユーザーIDを保存
      await saveUserId(response.user_id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Auth] Device authentication failed: ${errorMessage}`);
      throw new Error(`Device authentication failed: ${errorMessage}`);
    }
  },
};
