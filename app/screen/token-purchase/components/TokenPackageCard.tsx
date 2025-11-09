/**
 * @file TokenPackageCard.tsx
 * @summary Token package card component
 * @description Displays a single token package with purchase button
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { Product } from 'react-native-iap';
import type { TokenPackage } from '../../../constants/tokenPackages';
import { formatTokenAmount } from '../../../constants/tokenPackages';
import { getSharedStyles } from '../styles/sharedStyles';
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
  const theme = useTheme();
  const sharedStyles = getSharedStyles(theme);

  // Flash or Pro トークンの表示を決定
  const tokenDisplay = pkg.tokens.flash > 0
    ? `${formatTokenAmount(pkg.tokens.flash)} Flash トークン`
    : `${formatTokenAmount(pkg.tokens.pro)} Pro トークン`;

  return (
    <View style={[sharedStyles.baseCard, styles.card]}>
      {pkg.badge && (
        <View style={sharedStyles.badge}>
          <Text style={sharedStyles.badgeText}>{pkg.badge}</Text>
        </View>
      )}
      <Text style={sharedStyles.cardTitle}>{pkg.name}</Text>
      <Text style={sharedStyles.cardDescription}>{pkg.description}</Text>
      <Text style={sharedStyles.tokenInfo}>{tokenDisplay}</Text>
      <Text style={sharedStyles.cardPrice}>
        {product ? (product as any).localizedPrice || `¥${pkg.price}` : `¥${pkg.price}`}
      </Text>
      <TouchableOpacity
        style={[
          sharedStyles.primaryButton,
          purchasing && sharedStyles.primaryButtonDisabled,
        ]}
        onPress={() => onPurchase(pkg)}
        disabled={purchasing}
      >
        <Text style={sharedStyles.primaryButtonText}>
          {purchasing ? '購入中...' : '購入する'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    position: 'relative',
  },
});
