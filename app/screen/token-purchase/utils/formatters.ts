/**
 * @file formatters.ts
 * @summary Token formatting utility functions
 * @description Functions for formatting token amounts and limits
 */

/**
 * Format token limit for display
 * @param tokens - Token amount (-1 for unlimited, 0 for unavailable)
 * @returns Formatted string
 */
export const formatTokenLimit = (tokens: number): string => {
  if (tokens === -1) return '無制限';
  if (tokens === 0) return '利用不可';
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M/月`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}k/月`;
  return `${tokens}/月`;
};

/**
 * Format Flash token limit for display
 */
export const formatFlashTokenLimit = (tokens: number): string => {
  if (tokens === -1) return '無制限';
  if (tokens === 0) return 'トークン購入が必要';
  return formatTokenLimit(tokens);
};

/**
 * Format Pro token limit for display
 */
export const formatProTokenLimit = (tokens: number): string => {
  if (tokens === -1) return '無制限';
  if (tokens === 0) return '利用不可';
  return formatTokenLimit(tokens);
};
