/**
 * @file TokenUsageSection.tsx
 * @summary 設定画面のトークン残高・使用量セクションコンポーネント
 * @description
 * トークン使用量、残高、購入ボタンなどを表示する独立したコンポーネント。
 * SettingsScreenから分離して責任を明確化。
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../design/theme/ThemeContext';
import { RootStackParamList } from '../../navigation/types';
import { useMonthlyCost } from '../../billing/utils/costCalculationHelpers';
import { useSettingsStore } from '../settingsStore';
import { CreditAllocationModal } from './CreditAllocationModal';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

interface TokenUsageSectionProps {
  renderSection: (title: string) => React.ReactElement;
}

export const TokenUsageSection: React.FC<TokenUsageSectionProps> = ({ renderSection }) => {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { settings, getTotalTokensByCategory, shouldShowAllocationModal, setShouldShowAllocationModal } = useSettingsStore();

  // 月間コスト情報を取得（開発時のみ）
  const costInfo = __DEV__ ? useMonthlyCost() : null;

  // カテゴリーごとの合計トークン数を取得
  const quickTokens = getTotalTokensByCategory('quick');
  const thinkTokens = getTotalTokensByCategory('think');

  // クレジット配分モーダルの状態
  const [showAllocationModal, setShowAllocationModal] = useState(false);

  // 購入完了後の自動モーダル表示
  useEffect(() => {
    if (shouldShowAllocationModal) {
      setShowAllocationModal(true);
      setShouldShowAllocationModal(false);
    }
  }, [shouldShowAllocationModal, setShouldShowAllocationModal]);

  const styles = StyleSheet.create({
    usageContainer: {
      backgroundColor: colors.secondary,
      padding: spacing.md,
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
      borderRadius: 12,
    },
    modelTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    usageTitle: {
      ...typography.subtitle,
      color: colors.text,
    },
    balanceDisplay: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
    },
    balanceAmount: {
      fontSize: 36,
      fontWeight: 'bold',
      color: colors.text,
    },
    balanceLabel: {
      fontSize: typography.body.fontSize,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    purchaseButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      marginTop: spacing.sm,
    },
    purchaseButtonIcon: {
      marginRight: spacing.sm,
    },
    purchaseButtonText: {
      ...typography.body,
      color: '#FFFFFF',
      fontWeight: '600',
      flex: 1,
      textAlign: 'center',
    },
    modelBreakdownTitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      fontWeight: '600',
    },
    modelBreakdownItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modelInfoLeft: {
      flex: 1,
    },
    modelName: {
      ...typography.caption,
      color: colors.text,
    },
    modelUsage: {
      ...typography.caption,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    modelTokenDetail: {
      ...typography.caption,
      color: colors.textSecondary,
      fontSize: 11,
      marginTop: 2,
    },
    modelCost: {
      ...typography.caption,
      color: colors.primary,
      fontWeight: '700',
      marginLeft: spacing.md,
    },
    totalCostContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
      marginTop: spacing.sm,
      borderTopWidth: 2,
      borderTopColor: colors.primary,
      backgroundColor: `${colors.primary}10`, // 10% opacity
    },
    totalCostLabel: {
      ...typography.body,
      color: colors.text,
      fontWeight: '700',
    },
    totalCostValue: {
      ...typography.body,
      color: colors.primary,
      fontWeight: '700',
      fontSize: 16,
    },
  });

  return (
    <>
      {renderSection('トークン残高・使用量')}

      {/* 未配分クレジット残高 */}
      {settings.tokenBalance.credits > 0 && (
        <View style={styles.usageContainer}>
          <View style={styles.modelTitleRow}>
            <MaterialCommunityIcons
              name="wallet"
              size={20}
              color={colors.primary}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.usageTitle}>未配分クレジット</Text>
          </View>
          <View style={styles.balanceDisplay}>
            <Text style={styles.balanceAmount}>
              {settings.tokenBalance.credits}
            </Text>
            <Text style={styles.balanceLabel}>円</Text>
          </View>
          <TouchableOpacity
            style={styles.purchaseButton}
            onPress={() => setShowAllocationModal(true)}
          >
            <MaterialCommunityIcons name="swap-horizontal" size={20} color="#FFFFFF" style={styles.purchaseButtonIcon} />
            <Text style={styles.purchaseButtonText}>モデルに配分する</Text>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Quick tokens 使用量 */}
      <View style={styles.usageContainer}>
        <View style={styles.modelTitleRow}>
          <MaterialCommunityIcons
            name="speedometer"
            size={20}
            color="#FFC107"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.usageTitle}>Quick モデル</Text>
        </View>
        <View style={styles.balanceDisplay}>
          <Text style={styles.balanceAmount}>
            {quickTokens.toLocaleString()}
          </Text>
          <Text style={styles.balanceLabel}>トークン</Text>
        </View>
      </View>

      {/* Think tokens 使用量（購入トークンがある場合に表示） */}
      {thinkTokens > 0 && (
        <View style={styles.usageContainer}>
          <View style={styles.modelTitleRow}>
            <MaterialCommunityIcons
              name="speedometer-slow"
              size={20}
              color="#4CAF50"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.usageTitle}>Think モデル</Text>
          </View>
          <View style={styles.balanceDisplay}>
            <Text style={styles.balanceAmount}>
              {thinkTokens.toLocaleString()}
            </Text>
            <Text style={styles.balanceLabel}>トークン</Text>
          </View>
        </View>
      )}

      {/* 購入・プラン管理ボタン */}
      <View style={styles.usageContainer}>
        <TouchableOpacity
          style={styles.purchaseButton}
          onPress={() => navigation.navigate('TokenPurchase' as any)}
        >
          <Ionicons name="card" size={20} color="#FFFFFF" style={styles.purchaseButtonIcon} />
          <Text style={styles.purchaseButtonText}>トークンを購入</Text>
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* モデル別詳細（開発時のみ） */}
      {__DEV__ && Object.keys(settings.usage.monthlyTokensByModel).length > 0 && (
        <View style={styles.usageContainer}>
          <Text style={styles.modelBreakdownTitle}>モデル別詳細（開発用）</Text>
          {Object.entries(settings.usage.monthlyTokensByModel).map(([modelId, usage]) => {
            const totalTokens = usage.inputTokens + usage.outputTokens;
            // 開発時のみコスト情報を取得
            const modelCost = costInfo
              ? costInfo.costByModel.find(m => m.modelId === modelId)
              : null;
            return (
              <View key={modelId} style={styles.modelBreakdownItem}>
                <View style={styles.modelInfoLeft}>
                  <Text style={styles.modelName}>{modelId}</Text>
                  <Text style={styles.modelUsage}>
                    合計: {totalTokens.toLocaleString()}
                  </Text>
                  <Text style={styles.modelTokenDetail}>
                    入力: {usage.inputTokens.toLocaleString()} | 出力: {usage.outputTokens.toLocaleString()}
                  </Text>
                </View>
                {modelCost && (
                  <Text style={styles.modelCost}>{modelCost.formattedCost}</Text>
                )}
              </View>
            );
          })}
          {/* 開発時のみ総コストを表示 */}
          {costInfo && costInfo.totalCost > 0 && (
            <View style={styles.totalCostContainer}>
              <Text style={styles.totalCostLabel}>今月のコスト</Text>
              <Text style={styles.totalCostValue}>{costInfo.formattedTotalCost}</Text>
            </View>
          )}
        </View>
      )}

      {/* クレジット配分モーダル */}
      <CreditAllocationModal
        isVisible={showAllocationModal}
        onClose={() => setShowAllocationModal(false)}
      />
    </>
  );
};
