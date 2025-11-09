/**
 * @file BalanceDisplay.tsx
 * @summary Token balance display component
 * @description Shows current Flash and Pro token balances
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatTokenAmount } from '../../../constants/tokenPackages';
import { sharedStyles } from '../styles/sharedStyles';

interface BalanceDisplayProps {
  flashBalance: number;
  proBalance: number;
}

export const BalanceDisplay: React.FC<BalanceDisplayProps> = ({
  flashBalance,
  proBalance,
}) => {
  return (
    <View style={[sharedStyles.baseCard, styles.container]}>
      <Text style={styles.title}>現在のトークン残高</Text>
      <View style={styles.balanceRow}>
        <View style={styles.balanceItem}>
          <Text style={styles.label}>Flash トークン</Text>
          <Text style={styles.value}>{formatTokenAmount(flashBalance)}</Text>
        </View>
        {proBalance > 0 && (
          <View style={styles.balanceItem}>
            <Text style={styles.label}>Pro トークン</Text>
            <Text style={styles.value}>{formatTokenAmount(proBalance)}</Text>
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
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  balanceItem: {
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
});
