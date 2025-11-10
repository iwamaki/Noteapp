/**
 * @file subscriptionSyncService.ts
 * @summary Subscription status synchronization service
 * @description Syncs subscription status with backend using receipt verification
 */

import { Platform } from 'react-native';
import type { Purchase } from 'react-native-iap';
import { useSettingsStore } from '../../settings/settingsStore';
import { logger } from '../../utils/logger';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';

interface VerifyReceiptRequest {
  receipt: string;
  product_id: string;
  platform: 'android' | 'ios';
  package_name?: string;
}

interface SubscriptionStatus {
  tier: 'free' | 'standard' | 'pro' | 'premium';
  status: 'active' | 'canceled' | 'expired' | 'trial' | 'none';
  expires_at?: string;
  auto_renew: boolean;
  is_valid: boolean;
}

interface VerifyReceiptResponse {
  valid: boolean;
  subscription_status?: SubscriptionStatus;
  error?: string;
}

/**
 * バックエンドでレシート検証を実行
 */
export async function verifyReceiptWithBackend(
  purchase: Purchase
): Promise<VerifyReceiptResponse> {
  try {
    logger.info('subscriptionSync', 'Verifying receipt with backend', {
      productId: purchase.productId,
      platform: Platform.OS,
    });

    const request: VerifyReceiptRequest = {
      receipt: purchase.purchaseToken || purchase.transactionId || '',
      product_id: purchase.productId,
      platform: Platform.OS === 'android' ? 'android' : 'ios',
      package_name: Platform.OS === 'android' ? 'com.iwash.NoteApp' : undefined,
    };

    const response = await fetch(`${BACKEND_URL}/api/payment/verify-receipt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Receipt verification failed: ${response.status} ${errorText}`);
    }

    const result: VerifyReceiptResponse = await response.json();
    logger.info('subscriptionSync', 'Receipt verification result', result);

    return result;
  } catch (error) {
    logger.error('subscriptionSync', 'Failed to verify receipt', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * レシート検証結果をローカル設定に反映
 */
export async function syncSubscriptionStatus(
  verificationResult: VerifyReceiptResponse
): Promise<void> {
  if (!verificationResult.valid || !verificationResult.subscription_status) {
    logger.warn('subscriptionSync', 'Invalid verification result, skipping sync');
    return;
  }

  const { subscription_status } = verificationResult;
  const { updateSettings } = useSettingsStore.getState();

  await updateSettings({
    subscription: {
      tier: subscription_status.tier,
      status: subscription_status.status,
      expiresAt: subscription_status.expires_at,
      trialStartedAt: undefined,
      autoRenew: subscription_status.auto_renew,
    },
  });

  logger.info('subscriptionSync', 'Subscription status synced', subscription_status);
}

/**
 * 購入後のレシート検証とステータス同期
 */
export async function verifyAndSyncPurchase(purchase: Purchase): Promise<boolean> {
  const result = await verifyReceiptWithBackend(purchase);

  if (result.valid) {
    await syncSubscriptionStatus(result);
    return true;
  }

  return false;
}

/**
 * アプリ起動時のサブスクリプション状態チェック
 *
 * 既存のサブスクリプションがある場合、バックエンドで検証して
 * キャンセル状態などを同期します。
 */
export async function checkSubscriptionStatusOnStartup(): Promise<void> {
  try {
    const { settings } = useSettingsStore.getState();
    const { subscription } = settings;

    // サブスクリプションがない、または既に期限切れの場合はスキップ
    if (subscription.status === 'none' || subscription.status === 'expired') {
      logger.debug('subscriptionSync', 'No active subscription to check');
      return;
    }

    // 期限が設定されていない場合もスキップ
    if (!subscription.expiresAt) {
      logger.debug('subscriptionSync', 'No expiration date, skipping check');
      return;
    }

    logger.info('subscriptionSync', 'Checking subscription status on startup');

    // Phase 2: ここで最新の購入履歴を取得してレシート検証
    // 現在は簡易的に期限チェックのみ
    const now = new Date();
    const expiry = new Date(subscription.expiresAt);

    if (now >= expiry) {
      logger.info('subscriptionSync', 'Subscription expired, updating status');
      await useSettingsStore.getState().updateSettings({
        subscription: {
          ...subscription,
          status: 'expired',
        },
      });
    }

    // TODO: Google Play Billing APIから最新の購入履歴を取得して検証
    // await restorePurchases() で最新のレシートを取得
    // await verifyAndSyncPurchase() でバックエンド検証

  } catch (error) {
    logger.error('subscriptionSync', 'Failed to check subscription status', error);
  }
}
