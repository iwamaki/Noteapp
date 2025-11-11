/**
 * @file checkSubscriptionStatus.ts
 * @summary Subscription status check initialization task
 * @responsibility Check and sync subscription status on app startup
 */

import { InitializationTask, InitializationStage, TaskPriority } from '../types';
import { checkSubscriptionStatusOnStartup } from '../../billing/services/subscriptionSyncService';

export const checkSubscriptionStatusTask: InitializationTask = {
  id: 'check_subscription_status',
  name: 'サブスクリプション状態チェック',
  description: 'サブスクリプション状態をバックエンドと同期します',
  stage: InitializationStage.SERVICES,
  priority: TaskPriority.NORMAL,
  execute: async () => {
    try {
      await checkSubscriptionStatusOnStartup();
    } catch (error) {
      // サブスクリプションチェックは失敗してもアプリ起動を妨げない
      console.warn('[checkSubscriptionStatus] Failed to check subscription status:', error);
    }
  },
};
