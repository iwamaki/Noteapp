/**
 * @file PlanCard.tsx
 * @summary Subscription plan card component
 * @description Displays a subscription plan with features and purchase button
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Product } from 'react-native-iap';
import type { SubscriptionPlan } from '../../../constants/plans';
import { formatFlashTokenLimit, formatProTokenLimit } from '../utils/formatters';
import { getSharedStyles } from '../styles/sharedStyles';
import type { SubscriptionTier } from '../../../constants/plans';
import { useTheme } from '../../../design/theme/ThemeContext';

interface PlanCardProps {
  plan: SubscriptionPlan;
  product?: Product;
  isCurrentPlan: boolean;
  purchasing: boolean;
  onPurchase: (tier: SubscriptionTier) => void;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  product,
  isCurrentPlan,
  purchasing,
  onPurchase,
}) => {
  const theme = useTheme();
  const sharedStyles = getSharedStyles(theme);

  // トークン情報を整形
  const flashTokenDisplay = formatFlashTokenLimit(plan.limits.maxMonthlyFlashTokens);
  const proTokenDisplay = formatProTokenLimit(plan.limits.maxMonthlyProTokens);

  return (
    <View style={[sharedStyles.baseCard, styles.card]}>
      {isCurrentPlan && (
        <View style={[sharedStyles.badge, styles.currentBadge]}>
          <Text style={sharedStyles.badgeText}>現在のプラン</Text>
        </View>
      )}

      <Text style={sharedStyles.cardTitle}>{plan.displayName}</Text>
      <Text style={sharedStyles.cardDescription}>{plan.description}</Text>

      {/* トークン情報 */}
      <View style={styles.tokensContainer}>
        <View style={styles.tokenItem}>
          <Ionicons name="flash" size={theme.iconSizes.small} color={theme.colors.primary} />
          <Text style={sharedStyles.tokenInfo}>Flash: {flashTokenDisplay}</Text>
        </View>
        <View style={styles.tokenItem}>
          <Ionicons name="rocket" size={theme.iconSizes.small} color="#FF9500" />
          <Text style={sharedStyles.tokenInfo}>Pro: {proTokenDisplay}</Text>
        </View>
      </View>

      <Text style={sharedStyles.cardPrice}>
        {product ? (product as any).localizedPrice || `¥${plan.price}/月` : `¥${plan.price}/月`}
      </Text>

      {isCurrentPlan ? (
        <View style={styles.currentPlanButton}>
          <Ionicons name="checkmark-circle" size={20} color="#28a745" />
          <Text style={styles.currentPlanButtonText}>利用中</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[
            sharedStyles.primaryButton,
            purchasing && sharedStyles.primaryButtonDisabled,
          ]}
          onPress={() => onPurchase(plan.id as SubscriptionTier)}
          disabled={purchasing}
        >
          <Text style={sharedStyles.primaryButtonText}>
            {purchasing ? '購入中...' : `${plan.displayName}を購入`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    position: 'relative',
  },
  currentBadge: {
    backgroundColor: '#28a745',
  },
  tokensContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  tokenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  currentPlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 6,
  },
  currentPlanButtonText: {
    color: '#28a745',
    fontSize: 16,
    fontWeight: '600',
  },
});
