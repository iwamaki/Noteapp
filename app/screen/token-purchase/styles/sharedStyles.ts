/**
 * @file sharedStyles.ts
 * @summary Shared styles for token purchase components
 * @description Common style definitions for cards, badges, and buttons using theme
 */

import { StyleSheet } from 'react-native';

/**
 * Get shared styles based on theme
 */
export const getSharedStyles = (theme: {
  colors: any;
  typography: any;
  shadows: any;
  spacing: any;
}) => StyleSheet.create({
  // Card styles
  baseCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: theme.spacing.xl,
    ...theme.shadows.small,
  },

  // Badge styles
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: theme.colors.white,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '600',
  },

  // Text styles
  cardTitle: {
    fontSize: theme.typography.title.fontSize,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  cardDescription: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  cardPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },

  // Token info text (unified for both cards)
  tokenInfo: {
    fontSize: theme.typography.subtitle.fontSize,
    fontWeight: '500',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },

  // Button styles
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#CCC',
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontSize: theme.typography.subtitle.fontSize,
    fontWeight: '600',
  },

  // Notice card
  noteCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.xxl,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  noteTitle: {
    fontSize: theme.typography.subtitle.fontSize,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  noteText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.body.lineHeight,
  },
});
