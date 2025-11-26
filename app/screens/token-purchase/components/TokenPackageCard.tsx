/**
 * @file TokenPackageCard.tsx
 * @summary Token package card component
 * @description Displays a single token package as a tappable card using ListItem
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { Product } from 'react-native-iap';
import type { TokenPackage } from '../../../features/billing/constants/tokenPackages';
import { ListItem } from '../../../components/ListItem';
import { useTheme } from '../../../design/theme/ThemeContext';

interface TokenPackageCardProps {
  package: TokenPackage;
  product?: Product;
  onPress: (pkg: TokenPackage) => void;
}

export const TokenPackageCard: React.FC<TokenPackageCardProps> = ({
  package: pkg,
  product,
  onPress,
}) => {
  const { colors, spacing, typography } = useTheme();

  // クレジット表示
  const creditDisplay = `${pkg.credits}P`;

  const priceDisplay = product ? (product as any).localizedPrice || `¥${pkg.price}` : `¥${pkg.price}`;

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.secondary,
      borderRadius: 12,
      padding: spacing.md,
      marginBottom: spacing.sm,
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
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(pkg)}
      activeOpacity={0.7}
    >
      <ListItem.Title style={{ marginBottom: spacing.xs }}>{pkg.name}</ListItem.Title>
      <ListItem.Description numberOfLines={2}>{pkg.description}</ListItem.Description>

      <View style={styles.infoRow}>
        <Text style={styles.tokenInfo}>{creditDisplay}</Text>
        <Text style={styles.price}>{priceDisplay}</Text>
      </View>
    </TouchableOpacity>
  );
};
