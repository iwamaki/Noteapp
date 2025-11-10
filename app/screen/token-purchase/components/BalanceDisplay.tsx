/**
 * @file BalanceDisplay.tsx
 * @summary Token balance display component
 * @description Shows current Flash and Pro token balances
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatTokenAmount } from '../../../billing/constants/tokenPackages';
import { getSharedStyles } from '../styles/sharedStyles';
import { useTheme } from '../../../design/theme/ThemeContext';

interface BalanceDisplayProps {
  flashBalance: number;
  proBalance: number;
}

export const BalanceDisplay: React.FC<BalanceDisplayProps> = ({
  flashBalance,
  proBalance,
}) => {
  const theme = useTheme();
  const sharedStyles = getSharedStyles(theme);

  return (
    <View style={[sharedStyles.baseCard, styles.container]}>
      <Text style={[sharedStyles.cardTitle, styles.title]}>現在のトークン残高</Text>
      <View style={styles.balanceRow}>
        <View style={styles.balanceItem}>
          <Text style={sharedStyles.cardDescription}>Flash トークン</Text>
          <Text style={[styles.value, { color: theme.colors.primary }]}>
            {formatTokenAmount(flashBalance)}
          </Text>
        </View>
        {proBalance > 0 && (
          <View style={styles.balanceItem}>
            <Text style={sharedStyles.cardDescription}>Pro トークン</Text>
            <Text style={[styles.value, { color: theme.colors.primary }]}>
              {formatTokenAmount(proBalance)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  title: {
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  balanceItem: {
    alignItems: 'center',
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
