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
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../design/theme/ThemeContext';
import { RootStackParamList } from '../../navigation/types';
import { useMonthlyCredits } from '../../billing/utils/costCalculation';
import { useTokenBalanceStore, useUsageTrackingStore } from '../settingsStore';
import { ListItem } from '../../components/ListItem';
import { useAuth } from '../../auth/authStore';
import { useTranslation } from 'react-i18next';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

export const TokenUsageSection: React.FC = () => {
  const { t } = useTranslation();
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { balance } = useTokenBalanceStore();
  const { usage } = useUsageTrackingStore();
  const { isAuthenticated } = useAuth();

  // 月間クレジット消費情報を取得
  const creditsInfo = useMonthlyCredits();

  // 購入ボタンのハンドラー
  const handlePurchasePress = () => {
    if (!isAuthenticated) {
      // 未ログイン時: ログイン促進ダイアログを表示
      Alert.alert(
        t('tokenUsage.loginRequired'),
        t('tokenUsage.loginPrompt'),
        [
          {
            text: t('common.ok'),
            style: 'default',
          },
        ]
      );
    } else {
      // ログイン済み: 購入画面に遷移
      navigation.navigate('TokenPurchase' as any);
    }
  };

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
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    modelBreakdownItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.secondary,
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
      marginTop: spacing.sm,
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
              <Text><ListItem.Title>{t('tokenUsage.credits')}</ListItem.Title></Text>
            </View>
            {balance.credits > 0 && (
              <Text style={styles.valueText}>{balance.credits}P</Text>
            )}
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.purchaseButton}
              onPress={handlePurchasePress}
            >
              <Ionicons name="card" size={20} color="#FFFFFF" style={styles.purchaseButtonIcon} />
              <Text style={styles.purchaseButtonText}>{t('tokenUsage.purchase')}</Text>
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
            <Text><ListItem.Title>{t('tokenUsage.aiModelSettings')}</ListItem.Title></Text>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.purchaseButton}
              onPress={() => navigation.navigate('ModelSelection' as any)}
            >
              <MaterialCommunityIcons name="brain" size={20} color="#FFFFFF" style={styles.purchaseButtonIcon} />
              <Text style={styles.purchaseButtonText}>{t('tokenUsage.details')}</Text>
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </ListItem.Container>

      {/* 今月の使用量 */}
      {Object.keys(usage.monthlyTokensByModel).length > 0 && (
        <>
          <ListItem.Container>
            <View style={styles.iconRow}>
              <MaterialCommunityIcons
                name="chart-line"
                size={20}
                color={colors.primary}
                style={styles.iconContainer}
              />
              <Text><ListItem.Title>{t('tokenUsage.monthlyUsage')}</ListItem.Title></Text>
            </View>
          </ListItem.Container>

          {/* モデル別詳細 */}
          <View style={styles.usageContainer}>
            {creditsInfo.creditsByModel.map((modelCredits) => {
              const totalTokens = modelCredits.inputTokens + modelCredits.outputTokens;
              return (
                <View key={modelCredits.modelId} style={styles.modelBreakdownItem}>
                  <View style={styles.modelInfoLeft}>
                    <Text style={styles.modelName}>{modelCredits.displayName}</Text>
                    <Text style={styles.modelUsage}>
                      {totalTokens.toLocaleString()}{t('tokenUsage.tokens')}
                    </Text>
                  </View>
                  <Text style={styles.modelCost}>{modelCredits.formattedCredits}</Text>
                </View>
              );
            })}
            {/* 総クレジット消費を表示 */}
            {creditsInfo.totalCredits > 0 && (
              <View style={styles.totalCostContainer}>
                <Text style={styles.totalCostLabel}>{t('tokenUsage.monthlyConsumption')}</Text>
                <Text style={styles.totalCostValue}>{creditsInfo.formattedTotalCredits}</Text>
              </View>
            )}
          </View>
        </>
      )}
    </>
  );
};
