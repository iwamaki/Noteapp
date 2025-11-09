/**
 * @file SubscriptionSection.tsx
 * @summary 設定画面のサブスクリプションセクションコンポーネント
 * @description
 * サブスクリプション情報、トークン使用量、購入ボタンなどを表示する独立したコンポーネント。
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
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../design/theme/ThemeContext';
import { RootStackParamList } from '../../navigation/types';
import { useSubscription, getUsageColor, useMonthlyCost, useFlashTokenUsage, useProTokenUsage } from '../../utils/subscriptionHelpers';
import { SUBSCRIPTION_PLANS } from '../../constants/plans';
import { useSettingsStore } from '../settingsStore';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

interface SubscriptionSectionProps {
  renderSection: (title: string) => React.ReactElement;
}

export const SubscriptionSection: React.FC<SubscriptionSectionProps> = ({ renderSection }) => {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { tier, status } = useSubscription();
  const { settings } = useSettingsStore();

  // Flash/Pro 別のトークン使用量情報を取得
  const flashUsage = useFlashTokenUsage();
  const proUsage = useProTokenUsage();

  // 月間コスト情報を取得（開発時のみ）
  const costInfo = __DEV__ ? useMonthlyCost() : null;

  const styles = StyleSheet.create({
    subscriptionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.secondary,
      padding: spacing.lg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.lg,
    },
    subscriptionButtonContent: {
      flex: 1,
    },
    subscriptionButtonTitle: {
      ...typography.subtitle,
      color: colors.text,
      marginBottom: 4,
    },
    subscriptionButtonSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    subscriptionIcon: {
      marginLeft: spacing.md,
    },
    usageContainer: {
      backgroundColor: colors.secondary,
      padding: spacing.md,
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
      borderRadius: 12,
    },
    usageTitle: {
      ...typography.subtitle,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    usageText: {
      ...typography.body,
      color: colors.text,
    },
    progressBarContainer: {
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      borderRadius: 4,
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
      {renderSection('サブスクリプション')}

      <TouchableOpacity
        style={styles.subscriptionButton}
        onPress={() => navigation.navigate('Subscription')}
      >
        <View style={styles.subscriptionButtonContent}>
          <Text style={styles.subscriptionButtonTitle}>
            現在のプラン: {SUBSCRIPTION_PLANS[tier].displayName}
          </Text>
          <Text style={styles.subscriptionButtonSubtitle}>
            {status === 'active' || status === 'trial'
              ? 'タップしてプランを管理'
              : 'プランをアップグレード'}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={24}
          color={colors.textSecondary}
          style={styles.subscriptionIcon}
        />
      </TouchableOpacity>

      {/* Flash tokens 使用量 */}
      <View style={styles.usageContainer}>
        <Text style={styles.usageTitle}>Flash モデル</Text>
        {flashUsage.max !== -1 && flashUsage.max > 0 && (
          <>
            {/* サブスクリプション残量バー */}
            <View style={{ marginTop: 8 }}>
              <Text style={[styles.usageText, { fontSize: 11, color: '#666', marginBottom: 4 }]}>
                {Math.max(0, flashUsage.max - flashUsage.current).toLocaleString()} / {flashUsage.max.toLocaleString()} トークン
              </Text>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${100 - Math.min(flashUsage.percentage, 100)}%`,
                      backgroundColor: getUsageColor(flashUsage.percentage),
                    },
                  ]}
                />
              </View>
            </View>
            {/* 購入トークン残高バー（ある場合のみ） */}
            {settings.tokenBalance.flash > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.usageText, { fontSize: 11, color: '#007AFF', marginBottom: 4 }]}>
                  購入: {settings.tokenBalance.flash.toLocaleString()} トークン
                </Text>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${Math.min(100, (settings.tokenBalance.flash / flashUsage.max) * 100)}%`,
                        backgroundColor: '#007AFF',
                      },
                    ]}
                  />
                </View>
              </View>
            )}
          </>
        )}
        {/* サブスクなしで購入トークンのみある場合 */}
        {(flashUsage.max === -1 || flashUsage.max === 0) && settings.tokenBalance.flash > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text style={[styles.usageText, { fontSize: 11, color: '#007AFF', marginBottom: 4 }]}>
              購入: {settings.tokenBalance.flash.toLocaleString()} トークン
            </Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: '100%',
                    backgroundColor: '#007AFF',
                  },
                ]}
              />
            </View>
          </View>
        )}
      </View>

      {/* Pro tokens 使用量（サブスクプランがあるか、購入トークンがある場合に表示） */}
      {(proUsage.available || settings.tokenBalance.pro > 0) && (
        <View style={styles.usageContainer}>
          <Text style={styles.usageTitle}>Pro モデル</Text>
          {proUsage.max !== -1 && proUsage.max > 0 && (
            <>
              {/* サブスクリプション残量バー */}
              <View style={{ marginTop: 8 }}>
                <Text style={[styles.usageText, { fontSize: 11, color: '#666', marginBottom: 4 }]}>
                  {Math.max(0, proUsage.max - proUsage.current).toLocaleString()} / {proUsage.max.toLocaleString()} トークン
                </Text>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${100 - Math.min(proUsage.percentage, 100)}%`,
                        backgroundColor: getUsageColor(proUsage.percentage),
                      },
                    ]}
                  />
                </View>
              </View>
              {/* 購入トークン残高バー（ある場合のみ） */}
              {settings.tokenBalance.pro > 0 && (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.usageText, { fontSize: 11, color: '#007AFF', marginBottom: 4 }]}>
                    購入: {settings.tokenBalance.pro.toLocaleString()} トークン
                  </Text>
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${Math.min(100, (settings.tokenBalance.pro / proUsage.max) * 100)}%`,
                          backgroundColor: '#007AFF',
                        },
                      ]}
                    />
                  </View>
                </View>
              )}
            </>
          )}
          {/* サブスクなしで購入トークンのみある場合 */}
          {(proUsage.max === -1 || proUsage.max === 0) && settings.tokenBalance.pro > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={[styles.usageText, { fontSize: 11, color: '#007AFF', marginBottom: 4 }]}>
                購入: {settings.tokenBalance.pro.toLocaleString()} トークン
              </Text>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: '100%',
                      backgroundColor: '#007AFF',
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </View>
      )}

      {/* トークン購入ボタン */}
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
    </>
  );
};
