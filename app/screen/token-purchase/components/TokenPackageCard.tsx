/**
 * @file TokenPackageCard.tsx
 * @summary Token package card component
 * @description Displays a single token package with purchase button using ListItem
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { Product } from 'react-native-iap';
import type { TokenPackage } from '../../../billing/constants/tokenPackages';
import { formatTokenAmount } from '../../../billing/constants/tokenPackages';
import { ListItem } from '../../../components/ListItem';
import { useTheme } from '../../../design/theme/ThemeContext';

interface TokenPackageCardProps {
  package: TokenPackage;
  product?: Product;
  purchasing: boolean;
  onPurchase: (pkg: TokenPackage) => void;
}

export const TokenPackageCard: React.FC<TokenPackageCardProps> = ({
  package: pkg,
  product,
  purchasing,
  onPurchase,
}) => {
  const { colors, spacing, typography } = useTheme();

  // Flash or Pro トークンの表示を決定
  const tokenDisplay = pkg.tokens.flash > 0
    ? `${formatTokenAmount(pkg.tokens.flash)} Flash トークン`
    : `${formatTokenAmount(pkg.tokens.pro)} Pro トークン`;

  const priceDisplay = product ? (product as any).localizedPrice || `¥${pkg.price}` : `¥${pkg.price}`;

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.secondary,
      borderRadius: 12,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    badge: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 4,
    },
    badgeText: {
      color: colors.white,
      fontSize: typography.caption.fontSize,
      fontWeight: '600',
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    tokenInfo: {
      fontSize: typography.body.fontSize,
      fontWeight: '700',
      color: colors.text,
    },
    price: {
      fontSize: typography.subtitle.fontSize,
      fontWeight: '700',
      color: colors.primary,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: colors.white,
      fontSize: typography.body.fontSize,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.container}>
      {pkg.badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pkg.badge}</Text>
        </View>
      )}

      <ListItem.Title style={{ marginBottom: spacing.xs }}>{pkg.name}</ListItem.Title>
      <ListItem.Description numberOfLines={2}>{pkg.description}</ListItem.Description>

      <View style={styles.infoRow}>
        <View>
          <Text style={styles.tokenInfo}>{tokenDisplay}</Text>
          <Text style={styles.price}>{priceDisplay}</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, purchasing && styles.buttonDisabled]}
          onPress={() => onPurchase(pkg)}
          disabled={purchasing}
        >
          <Text style={styles.buttonText}>
            {purchasing ? '購入中...' : '購入する'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
