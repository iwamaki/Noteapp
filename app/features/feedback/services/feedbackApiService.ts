/**
 * @file feedbackApiService.ts
 * @summary Backend feedback API service layer
 * @description
 * Sends user feedback to the backend for product improvement.
 */

import { createHttpClient, HttpClient } from '../../api';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ======================
// Type Definitions
// ======================

export type FeedbackCategory = 'bug' | 'feature' | 'improvement' | 'other';

export interface FeedbackEntry {
  category: FeedbackCategory;
  content: string;
  rating?: number;  // 1-5
  deviceId?: string;
}

interface FeedbackResponse {
  success: boolean;
  feedback_id: number;
}

// ======================
// Feedback API Service
// ======================

export class FeedbackApiService {
  private client: HttpClient;
  private readonly appVersion: string;
  private readonly platform: string;

  constructor(baseUrl: string) {
    this.client = createHttpClient({
      baseUrl: `${baseUrl}/api/feedback`,
      timeout: 10000,
      includeAuth: true,
      logContext: 'feedbackApi',
    });

    this.appVersion = Constants.expoConfig?.version || 'unknown';
    this.platform = Platform.OS;
  }

  /**
   * フィードバックを送信
   */
  async sendFeedback(entry: FeedbackEntry): Promise<FeedbackResponse> {
    const response = await this.client.post<FeedbackResponse>('', {
      category: entry.category,
      content: entry.content,
      rating: entry.rating,
      app_version: this.appVersion,
      platform: this.platform,
      device_id: entry.deviceId,
    });

    return response.data;
  }
}

// ======================
// Singleton Instance
// ======================

let feedbackApiService: FeedbackApiService | null = null;

/**
 * FeedbackApiService を初期化
 */
export function initFeedbackApiService(backendUrl: string): void {
  if (feedbackApiService) {
    return;
  }

  feedbackApiService = new FeedbackApiService(backendUrl);
}

/**
 * FeedbackApiService のインスタンスを取得
 * 初期化されていない場合は null を返す（エラーを投げない）
 */
export function getFeedbackApiService(): FeedbackApiService | null {
  return feedbackApiService;
}

/**
 * FeedbackApiService が初期化されているかチェック
 */
export function isFeedbackApiServiceInitialized(): boolean {
  return feedbackApiService !== null;
}
