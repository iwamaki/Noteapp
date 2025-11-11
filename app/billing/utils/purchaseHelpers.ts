/**
 * @file purchaseHelpers.ts
 * @summary Purchase-related utility functions
 * @description Helper functions for purchase error handling
 */

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
