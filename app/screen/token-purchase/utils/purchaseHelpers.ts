/**
 * @file purchaseHelpers.ts
 * @summary Purchase-related utility functions
 * @description Helper functions for purchase error handling and product ID mapping
 */

import { PRODUCT_IDS } from '../../../data/services/iapService';
import { SubscriptionTier } from '../../../constants/plans';

/**
 * Check if an error is a user cancellation
 */
export const isUserCancelledError = (error: any): boolean => {
  const errorCode = String(error.code).toLowerCase();
  return (
    errorCode === 'e_user_cancelled' ||
    errorCode === 'user_cancelled' ||
    errorCode === 'user-cancelled'
  );
};

/**
 * Get product ID for a given subscription tier
 */
export const getProductIdForTier = (targetTier: SubscriptionTier): string | null => {
  switch (targetTier) {
    case 'standard':
      return PRODUCT_IDS.STANDARD_MONTHLY;
    case 'pro':
      return PRODUCT_IDS.PRO_MONTHLY;
    case 'premium':
      return PRODUCT_IDS.PREMIUM_MONTHLY;
    default:
      return null;
  }
};
