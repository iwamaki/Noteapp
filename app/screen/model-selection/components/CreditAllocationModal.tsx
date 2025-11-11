/**
 * @file CreditAllocationModal.tsx
 * @summary クレジット配分モーダル
 * @description 選択したモデルにクレジットをトークンとして配分するシンプルなモーダル
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CustomModal } from '../../../components/CustomModal';
import { useTheme } from '../../../design/theme/ThemeContext';
import { useCreditAllocation } from '../hooks/useCreditAllocation';

interface CreditAllocationModalProps {
  isVisible: boolean;
  onClose: () => void;
  initialModelId?: string;
}

export const CreditAllocationModal: React.FC<CreditAllocationModalProps> = ({
  isVisible,
  onClose,
  initialModelId,
}) => {
  const { colors, spacing, typography } = useTheme();
  const {
    modelInfo,
    isLoadingModel,
    creditsToAllocate,
    isAllocating,
    categoryStyle,
    convertedTokens,
    capacityInfo,
    maxAllocatableCredits,
    setCreditsToAllocate,
    handleAllocate,
    settings,
  } = useCreditAllocation({ isVisible, initialModelId, onClose });

  const styles = StyleSheet.create({
    balanceContainer: {
      backgroundColor: colors.secondary,
      padding: spacing.md,
      borderRadius: 8,
      marginBottom: spacing.md,
      alignItems: 'center',
    },
    balanceLabel: {
      fontSize: typography.caption.fontSize,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    balanceAmount: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
    },
    modelInfoContainer: {
      backgroundColor: colors.secondary,
      padding: spacing.md,
      borderRadius: 8,
      marginBottom: spacing.md,
      borderWidth: 2,
      borderColor: categoryStyle?.color || colors.border,
    },
    modelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    modelCategory: {
      fontSize: typography.caption.fontSize,
      color: categoryStyle?.color || colors.textSecondary,
      fontWeight: '600',
      marginLeft: spacing.xs,
    },
    modelName: {
      fontSize: typography.subtitle.fontSize,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: spacing.xs,
    },
    modelDescription: {
      fontSize: typography.caption.fontSize,
      color: colors.textSecondary,
    },
    currentBalance: {
      fontSize: typography.caption.fontSize,
      color: colors.textSecondary,
      marginTop: spacing.sm,
      textAlign: 'center',
    },
    currentBalanceAmount: {
      fontSize: typography.body.fontSize,
      fontWeight: 'bold',
      color: colors.primary,
    },
    sectionTitle: {
      fontSize: typography.body.fontSize,
      fontWeight: '600',
      color: colors.text,
      marginBottom: spacing.sm,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    stepButton: {
      backgroundColor: colors.secondary,
      padding: spacing.sm,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.secondary,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
    },
    input: {
      flex: 1,
      fontSize: typography.subtitle.fontSize,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      paddingVertical: spacing.sm,
    },
    inputSuffix: {
      fontSize: typography.body.fontSize,
      color: colors.textSecondary,
      marginLeft: spacing.xs,
    },
    quickButtons: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    quickButton: {
      flex: 1,
      backgroundColor: colors.secondary,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    quickButtonText: {
      fontSize: typography.caption.fontSize,
      color: colors.primary,
      fontWeight: '600',
    },
    quickButtonTextDisabled: {
      color: colors.textSecondary,
    },
    conversionContainer: {
      backgroundColor: colors.secondary,
      padding: spacing.md,
      borderRadius: 8,
      marginTop: spacing.md,
      marginBottom: spacing.md,
    },
    conversionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    conversionLabel: {
      fontSize: typography.body.fontSize,
      color: colors.textSecondary,
    },
    conversionValue: {
      fontSize: typography.body.fontSize,
      fontWeight: '600',
      color: colors.text,
    },
    conversionValueLarge: {
      fontSize: typography.subtitle.fontSize,
      fontWeight: 'bold',
      color: colors.primary,
    },
    capacityContainer: {
      backgroundColor: capacityInfo.isOverLimit ? `${colors.danger}15` : colors.secondary,
      padding: spacing.md,
      borderRadius: 8,
      marginBottom: spacing.sm,
    },
    capacityHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    capacityLabel: {
      fontSize: typography.body.fontSize,
      color: colors.text,
      fontWeight: '600',
    },
    capacityPercent: {
      fontSize: typography.body.fontSize,
      fontWeight: 'bold',
      color: capacityInfo.isOverLimit ? colors.danger : colors.primary,
    },
    capacityBar: {
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 4,
      overflow: 'hidden',
    },
    capacityFill: {
      height: '100%',
      backgroundColor: capacityInfo.isOverLimit ? colors.danger : colors.primary,
    },
    capacityText: {
      fontSize: typography.caption.fontSize,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    warningContainer: {
      backgroundColor: `${colors.danger}15`,
      padding: spacing.sm,
      borderRadius: 8,
      marginBottom: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
    },
    warningIcon: {
      marginRight: spacing.sm,
    },
    warningText: {
      flex: 1,
      fontSize: typography.caption.fontSize,
      color: colors.danger,
    },
  });

  // ローディング中の表示
  if (isLoadingModel) {
    return (
      <CustomModal
        isVisible={isVisible}
        title="💰 クレジット配分"
        buttons={[
          {
            text: '閉じる',
            style: 'cancel',
            onPress: onClose,
          },
        ]}
        onClose={onClose}
      >
        <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: spacing.md, color: colors.textSecondary }}>
            モデル情報を読み込み中...
          </Text>
        </View>
      </CustomModal>
    );
  }

  if (!modelInfo) {
    return null;
  }

  return (
    <CustomModal
      isVisible={isVisible}
      title="💰 クレジット配分"
      buttons={[
        {
          text: 'キャンセル',
          style: 'cancel',
          onPress: onClose,
        },
        {
          text: isAllocating ? '配分中...' : '配分する',
          style: 'default',
          onPress: handleAllocate,
          disabled: isAllocating || capacityInfo.isOverLimit,
        },
      ]}
      onClose={onClose}
    >
      {/* 現在のクレジット残高 */}
      <View style={styles.balanceContainer}>
        <Text style={styles.balanceLabel}>未配分クレジット</Text>
        <Text style={styles.balanceAmount}>
          {settings.tokenBalance.credits}円
        </Text>
      </View>

      {/* 配分先モデル情報 */}
      <View style={styles.modelInfoContainer}>
        <View style={styles.modelHeader}>
          <MaterialCommunityIcons
            name={categoryStyle?.icon || 'speedometer'}
            size={20}
            color={categoryStyle?.color || colors.primary}
          />
          <Text style={styles.modelCategory}>
            {categoryStyle?.label}モデル
          </Text>
        </View>
        <Text style={styles.modelName}>{modelInfo.name}</Text>
        <Text style={styles.modelDescription}>{modelInfo.description}</Text>
        <Text style={styles.currentBalance}>
          現在の残高:{' '}
          <Text style={styles.currentBalanceAmount}>
            {(settings.tokenBalance.allocatedTokens[modelInfo.id] || 0).toLocaleString()}
          </Text>{' '}
          トークン
        </Text>
      </View>

      {/* クレジット入力 */}
      <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>配分するクレジット</Text>
      <View style={styles.inputRow}>
        <TouchableOpacity
          style={styles.stepButton}
          onPress={() => setCreditsToAllocate(Math.max(10, creditsToAllocate - 10))}
          disabled={creditsToAllocate <= 10}
        >
          <MaterialCommunityIcons
            name="minus"
            size={24}
            color={creditsToAllocate <= 10 ? colors.textSecondary : colors.primary}
          />
        </TouchableOpacity>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={creditsToAllocate.toString()}
            onChangeText={(text) => {
              const num = parseInt(text) || 0;
              const rounded = Math.round(num / 10) * 10;
              setCreditsToAllocate(
                Math.min(
                  Math.max(10, rounded),
                  settings.tokenBalance.credits
                )
              );
            }}
            keyboardType="numeric"
            selectTextOnFocus
          />
          <Text style={styles.inputSuffix}>円</Text>
        </View>
        <TouchableOpacity
          style={styles.stepButton}
          onPress={() =>
            setCreditsToAllocate(
              Math.min(settings.tokenBalance.credits, creditsToAllocate + 10)
            )
          }
          disabled={creditsToAllocate >= settings.tokenBalance.credits}
        >
          <MaterialCommunityIcons
            name="plus"
            size={24}
            color={
              creditsToAllocate >= settings.tokenBalance.credits
                ? colors.textSecondary
                : colors.primary
            }
          />
        </TouchableOpacity>
      </View>
      <View style={styles.quickButtons}>
        {[100, 300, 500, 1000].map((amount) => (
          <TouchableOpacity
            key={amount}
            style={styles.quickButton}
            onPress={() =>
              setCreditsToAllocate(
                Math.min(amount, settings.tokenBalance.credits)
              )
            }
            disabled={settings.tokenBalance.credits < amount}
          >
            <Text
              style={[
                styles.quickButtonText,
                settings.tokenBalance.credits < amount && styles.quickButtonTextDisabled,
              ]}
            >
              {amount}円
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 変換結果 */}
      <View style={styles.conversionContainer}>
        <View style={styles.conversionRow}>
          <Text style={styles.conversionLabel}>配分するクレジット:</Text>
          <Text style={styles.conversionValue}>{creditsToAllocate}円</Text>
        </View>
        <View style={styles.conversionRow}>
          <Text style={styles.conversionLabel}>→ 追加されるトークン:</Text>
          <Text style={styles.conversionValueLarge}>
            {convertedTokens.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* 容量制限表示 */}
      <View style={styles.capacityContainer}>
        <View style={styles.capacityHeader}>
          <Text style={styles.capacityLabel}>
            {categoryStyle?.label}カテゴリー容量
          </Text>
          <Text style={styles.capacityPercent}>
            {capacityInfo.usagePercent.toFixed(0)}%
          </Text>
        </View>
        <View style={styles.capacityBar}>
          <View
            style={[
              styles.capacityFill,
              { width: `${Math.min(100, capacityInfo.usagePercent)}%` },
            ]}
          />
        </View>
        <Text style={styles.capacityText}>
          {capacityInfo.newTotal.toLocaleString()} / {capacityInfo.limit.toLocaleString()} トークン
        </Text>
      </View>

      {/* 容量超過警告 */}
      {capacityInfo.isOverLimit && (
        <View style={styles.warningContainer}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={20}
            color={colors.danger}
            style={styles.warningIcon}
          />
          <Text style={styles.warningText}>
            容量制限を超えています。最大{maxAllocatableCredits}円まで配分できます。
          </Text>
        </View>
      )}
    </CustomModal>
  );
};
