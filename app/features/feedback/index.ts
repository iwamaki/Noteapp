/**
 * @file index.ts
 * @summary フィードバック機能のエントリーポイント
 */

export {
  FeedbackApiService,
  initFeedbackApiService,
  getFeedbackApiService,
  isFeedbackApiServiceInitialized,
} from './services/feedbackApiService';

export type { FeedbackEntry, FeedbackCategory } from './services/feedbackApiService';
