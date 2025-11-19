/**
 * @file TokenUsageSection.tsx
 * @summary 設定画面のトークン残高・使用量セクションコンポーネント
 * @description
 * トークン使用量、残高、購入ボタンなどを表示する独立したコンポーネント。
 * SettingsScreenから分離して責任を明確化。
 */

import React from 'react';
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
import { useMonthlyCost } from '../../billing/utils/costCalculation';
import { useTokenBalanceStore, useUsageTrackingStore } from '../settingsStore';
import { ListItem } from '../../components/ListItem';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

export const TokenUsageSection: React.FC = () => {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { balance } = useTokenBalanceStore();
  const { usage } = useUsageTrackingStore();

  // 月間コスト情報を取得（開発時のみ）
  const costInfo = __DEV__ ? useMonthlyCost() : null;

  const styles = StyleSheet.create({
    valueText: {
      ...typography.body,
      color: colors.text,
      fontWeight: '600',
    },
    iconContainer: {
      marginRight: spacing.sm,
    },
    purchaseButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    purchaseButtonIcon: {
      marginRight: spacing.sm,
    },
    purchaseButtonText: {
      ...typography.body,
      color: colors.white,
      fontWeight: '600',
    },
    usageContainer: {
      backgroundColor: colors.secondary,
      padding: spacing.md,
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
      borderRadius: 12,
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
    containerFlex: {
      flex: 1,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    iconRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
  });

  return (
    <>
      {/* トークン購入・クレジット */}
      <ListItem.Container>
        <View style={styles.containerFlex}>
          <View style={styles.headerRow}>
            <View style={styles.iconRow}>
              <MaterialCommunityIcons
                name="wallet"
                size={20}
                color={colors.primary}
                style={styles.iconContainer}
              />
              <Text><ListItem.Title>クレジット</ListItem.Title></Text>
            </View>
            {balance.credits > 0 && (
              <Text style={styles.valueText}>{balance.credits}P</Text>
            )}
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.purchaseButton}
              onPress={() => navigation.navigate('TokenPurchase' as any)}
            >
              <Ionicons name="card" size={20} color="#FFFFFF" style={styles.purchaseButtonIcon} />
              <Text style={styles.purchaseButtonText}>購入</Text>
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </ListItem.Container>

      {/* LLMモデル設定画面遷移 */}
      <ListItem.Container>
        <View style={styles.containerFlex}>
          <View style={styles.iconRow}>
            <MaterialCommunityIcons
              name="cog"
              size={20}
              color={colors.primary}
              style={styles.iconContainer}
            />
            <Text><ListItem.Title>LLM設定</ListItem.Title></Text>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.purchaseButton}
              onPress={() => navigation.navigate('ModelSelection' as any)}
            >
              <MaterialCommunityIcons name="brain" size={20} color="#FFFFFF" style={styles.purchaseButtonIcon} />
              <Text style={styles.purchaseButtonText}>詳細</Text>
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </ListItem.Container>

      {/* モデル別詳細（開発時のみ） */}
      {__DEV__ && Object.keys(usage.monthlyTokensByModel).length > 0 && (
        <View style={styles.usageContainer}>
          <Text style={styles.modelBreakdownTitle}>モデル別詳細（開発用）</Text>
          {Object.entries(usage.monthlyTokensByModel).map(([modelId, modelUsage]) => {
            const totalTokens = modelUsage.inputTokens + modelUsage.outputTokens;
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
                    入力: {modelUsage.inputTokens.toLocaleString()} | 出力: {modelUsage.outputTokens.toLocaleString()}
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
    </>
  );
};
