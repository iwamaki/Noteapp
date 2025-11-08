/**
 * @file PlanCard.tsx
 * @summary サブスクリプションプランカードコンポーネント
 * @description
 * 各プラン（Free/Pro/Enterprise）の情報を表示するカード。
 * 現在のプランはハイライト表示され、購入ボタンを表示。
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../design/theme/ThemeContext';
import type { SubscriptionPlan } from '../../../constants/plans';

interface PlanCardProps {
  plan: SubscriptionPlan;
  isCurrentPlan: boolean;
  isRecommended?: boolean;
}

/**
 * プランカード
 *
 * 機能:
 * - プラン名と価格表示
 * - 主要機能のリスト
 * - 購入ボタン（現在のプランの場合は「現在のプラン」表示）
 * - おすすめバッジ表示
 */
export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  isCurrentPlan,
  isRecommended = false,
}) => {
  const { colors, typography } = useTheme();

  // 主要機能のリスト（表示用）
  const mainFeatures = [
    {
      key: 'files',
      label: 'ファイル数',
      value:
        plan.limits.maxFiles === -1
          ? '無制限'
          : `${plan.limits.maxFiles.toLocaleString()}個`,
    },
    {
      key: 'llm',
      label: 'LLMリクエスト',
      value:
        plan.limits.maxLLMRequests === -1
          ? '無制限'
          : `${plan.limits.maxLLMRequests.toLocaleString()}回/月`,
    },
    {
      key: 'storage',
      label: 'ストレージ',
      value:
        plan.limits.maxStorageMB === -1
          ? '無制限'
          : `${(plan.limits.maxStorageMB / 1000).toFixed(1)}GB`,
    },
  ];

  // プロ機能
  const proFeatures: { key: keyof typeof plan.features; label: string }[] = [
    { key: 'advancedModels', label: '高度なLLMモデル' },
    { key: 'ragSearch', label: 'RAG検索' },
    { key: 'webSearch', label: 'Web検索' },
  ];

  const activeProFeatures = proFeatures.filter((f) => plan.features[f.key]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      {/* おすすめバッジ */}
      {isRecommended && (
        <View
          style={[
            styles.recommendedBadge,
            { backgroundColor: colors.primary },
          ]}
        >
          <Text style={[styles.recommendedText, { color: colors.white }]}>
            おすすめ
          </Text>
        </View>
      )}

      {/* プラン名 */}
      <Text style={[styles.planName, typography.title, { color: colors.text }]}>
        {plan.displayName}
      </Text>

      {/* 価格 */}
      <View style={styles.priceContainer}>
        {plan.price === 0 ? (
          <Text
            style={[styles.priceText, typography.title, { color: colors.text }]}
          >
            無料
          </Text>
        ) : (
          <>
            <Text
              style={[
                styles.priceText,
                typography.title,
                { color: colors.text },
              ]}
            >
              ¥{plan.price.toLocaleString()}
            </Text>
            <Text
              style={[
                styles.pricePeriod,
                typography.caption,
                { color: colors.textSecondary },
              ]}
            >
              /月
            </Text>
          </>
        )}
      </View>

      {/* 説明 */}
      {plan.description && (
        <Text
          style={[
            styles.description,
            typography.body,
            { color: colors.textSecondary },
          ]}
        >
          {plan.description}
        </Text>
      )}

      {/* 主要機能 */}
      <View style={styles.featuresContainer}>
        {mainFeatures.map((feature) => (
          <View key={feature.key} style={styles.featureRow}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.success}
            />
            <Text
              style={[
                styles.featureText,
                typography.body,
                { color: colors.text },
              ]}
            >
              {feature.label}: {feature.value}
            </Text>
          </View>
        ))}

        {/* プロ機能 */}
        {activeProFeatures.length > 0 && (
          <View style={[styles.proFeaturesSection, { borderTopColor: colors.border }]}>
            <Text
              style={[
                styles.proFeaturesTitle,
                typography.caption,
                { color: colors.textSecondary },
              ]}
            >
              プロ機能:
            </Text>
            {activeProFeatures.map((feature) => (
              <View key={feature.key} style={styles.featureRow}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.primary}
                />
                <Text
                  style={[
                    styles.featureText,
                    typography.body,
                    { color: colors.text },
                  ]}
                >
                  {feature.label}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    position: 'relative',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -8,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  planName: {
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  priceText: {
    fontWeight: 'bold',
  },
  pricePeriod: {
    marginLeft: 4,
  },
  description: {
    marginBottom: 16,
  },
  featuresContainer: {
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    marginLeft: 8,
    flex: 1,
  },
  proFeaturesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  proFeaturesTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontWeight: '600',
  },
});
