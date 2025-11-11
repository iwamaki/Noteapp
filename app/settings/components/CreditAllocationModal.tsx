/**
 * @file CreditAllocationModal.tsx
 * @summary クレジット配分モーダル
 * @description クレジットをモデルにトークンとして配分するモーダル
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CustomModal } from '../../components/CustomModal';
import { useTheme } from '../../design/theme/ThemeContext';
import { useSettingsStore, TOKEN_CAPACITY_LIMITS } from '../settingsStore';
import { creditsToTokens, getTokenPrice } from '../../billing/constants/tokenPricing';
import APIService from '../../features/chat/llmService/api';
import { convertProvidersToModelInfo, type ModelInfo } from '../../screen/model-selection/constants';

interface CreditAllocationModalProps {
  isVisible: boolean;
  onClose: () => void;
  initialCredits?: number; // 購入後すぐ開く場合の初期値
  initialModelId?: string; // 初期選択モデル（指定されている場合）
}

export const CreditAllocationModal: React.FC<CreditAllocationModalProps> = ({
  isVisible,
  onClose,
  initialCredits,
  initialModelId,
}) => {
  const { colors, spacing, typography } = useTheme();
  const { settings, allocateCredits, getTotalTokensByCategory } = useSettingsStore();

  // バックエンドから取得したモデル一覧
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  // モデル選択
  const [selectedModelId, setSelectedModelId] = useState<string>(
    initialModelId || 'gemini-2.5-flash'
  );

  // 配分するクレジット額（10円刻み）
  const [creditsToAllocate, setCreditsToAllocate] = useState<number>(
    initialCredits ? Math.min(initialCredits, settings.tokenBalance.credits) : 10
  );

  const [isAllocating, setIsAllocating] = useState(false);

  // モデル情報をバックエンドから取得
  useEffect(() => {
    const loadModels = async () => {
      try {
        setIsLoadingModels(true);
        const providers = await APIService.loadLLMProviders();
        const models = convertProvidersToModelInfo(providers);
        setAvailableModels(models);

        // 初期選択モデルが指定されていない場合、最初のモデルを選択
        if (!initialModelId && models.length > 0) {
          setSelectedModelId(models[0].id);
        }
      } catch (error) {
        console.error('Failed to load models:', error);
        Alert.alert('エラー', 'モデル情報の読み込みに失敗しました');
      } finally {
        setIsLoadingModels(false);
      }
    };

    if (isVisible) {
      loadModels();
    }
  }, [isVisible, initialModelId]);

  const selectedModel = availableModels.find((m) => m.id === selectedModelId);

  // カテゴリーごとの色とアイコン
  const getCategoryStyle = (category: 'quick' | 'think') => {
    return category === 'quick'
      ? { color: '#FFC107', icon: 'speedometer' as const }
      : { color: '#4CAF50', icon: 'speedometer-slow' as const };
  };

  // クレジット→トークン変換
  const convertedTokens = useMemo(() => {
    return creditsToTokens(selectedModelId, creditsToAllocate);
  }, [selectedModelId, creditsToAllocate]);

  // 容量制限チェック
  const capacityInfo = useMemo(() => {
    if (!selectedModel) {
      return {
        currentTotal: 0,
        newTotal: 0,
        limit: 0,
        remaining: 0,
        isOverLimit: false,
        usagePercent: 0,
      };
    }

    const category = selectedModel.category;
    const currentTotal = getTotalTokensByCategory(category);
    const currentModelTokens = settings.tokenBalance.allocatedTokens[selectedModelId] || 0;
    const newTotal = currentTotal - currentModelTokens + (currentModelTokens + convertedTokens);
    const limit = TOKEN_CAPACITY_LIMITS[category];
    const remaining = limit - (currentTotal - currentModelTokens);

    return {
      currentTotal,
      newTotal,
      limit,
      remaining,
      isOverLimit: newTotal > limit,
      usagePercent: Math.min(100, (newTotal / limit) * 100),
    };
  }, [selectedModel, getTotalTokensByCategory, settings.tokenBalance.allocatedTokens, selectedModelId, convertedTokens]);

  // 最大配分可能クレジット
  const maxAllocatableCredits = useMemo(() => {
    const pricePerMToken = getTokenPrice(selectedModelId);
    if (!pricePerMToken) return settings.tokenBalance.credits;

    const maxTokens = capacityInfo.remaining;
    const maxCredits = Math.floor((maxTokens / 1_000_000) * pricePerMToken);
    return Math.min(settings.tokenBalance.credits, maxCredits);
  }, [selectedModelId, capacityInfo.remaining, settings.tokenBalance.credits]);

  // 配分実行
  const handleAllocate = async () => {
    if (!selectedModel) {
      Alert.alert('エラー', 'モデルを選択してください');
      return;
    }

    if (creditsToAllocate <= 0) {
      Alert.alert('エラー', '配分するクレジット額を指定してください');
      return;
    }

    if (capacityInfo.isOverLimit) {
      Alert.alert('容量超過', '指定した配分量が容量制限を超えています');
      return;
    }

    setIsAllocating(true);

    try {
      await allocateCredits([
        {
          modelId: selectedModelId,
          credits: creditsToAllocate,
        },
      ]);

      Alert.alert(
        '✅ 配分完了',
        `${creditsToAllocate}円分のクレジットを\n${selectedModel.name}に配分しました\n\n${convertedTokens.toLocaleString()}トークンが追加されました`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error: any) {
      console.error('[CreditAllocationModal] Allocation error:', error);
      Alert.alert('エラー', error.message || '配分中にエラーが発生しました');
    } finally {
      setIsAllocating(false);
    }
  };

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
    sectionTitle: {
      fontSize: typography.body.fontSize,
      fontWeight: '600',
      color: colors.text,
      marginBottom: spacing.sm,
    },
    modelSelector: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    modelButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.md,
      borderRadius: 8,
      borderWidth: 2,
    },
    modelButtonSelected: {
      backgroundColor: colors.secondary,
    },
    modelButtonUnselected: {
      backgroundColor: colors.background,
      borderColor: colors.border,
    },
    modelButtonTextContainer: {
      marginLeft: spacing.xs,
    },
    modelButtonText: {
      fontSize: typography.body.fontSize,
      fontWeight: '600',
    },
    sliderContainer: {
      marginBottom: spacing.md,
    },
    sliderLabel: {
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
  if (isLoadingModels) {
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
        },
      ]}
      onClose={onClose}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 現在の残高 */}
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>未配分クレジット</Text>
          <Text style={styles.balanceAmount}>
            {settings.tokenBalance.credits}円
          </Text>
        </View>

        {/* モデル選択 */}
        <Text style={styles.sectionTitle}>配分先のモデル</Text>

        {/* Quickカテゴリー */}
        <Text style={[styles.sectionTitle, { fontSize: 13, color: colors.textSecondary, marginTop: spacing.sm }]}>
          ⚡ Quick（高速モデル）
        </Text>
        {availableModels
          .filter((model) => model.category === 'quick')
          .map((model) => {
            const isSelected = model.id === selectedModelId;
            const categoryStyle = getCategoryStyle(model.category);
            return (
              <TouchableOpacity
                key={model.id}
                style={[
                  styles.modelButton,
                  isSelected ? styles.modelButtonSelected : styles.modelButtonUnselected,
                  { borderColor: isSelected ? categoryStyle.color : colors.border, marginBottom: spacing.xs },
                ]}
                onPress={() => {
                  setSelectedModelId(model.id);
                  setCreditsToAllocate(Math.min(10, settings.tokenBalance.credits));
                }}
              >
                <MaterialCommunityIcons
                  name={categoryStyle.icon}
                  size={20}
                  color={isSelected ? categoryStyle.color : colors.textSecondary}
                />
                <View style={styles.modelButtonTextContainer}>
                  <Text
                    style={[
                      styles.modelButtonText,
                      { color: isSelected ? colors.text : colors.textSecondary },
                    ]}
                  >
                    {model.shortName}
                  </Text>
                  {model.recommended && (
                    <Text style={{ fontSize: 10, color: categoryStyle.color, marginLeft: spacing.xs }}>
                      (推奨)
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

        {/* Thinkカテゴリー */}
        <Text style={[styles.sectionTitle, { fontSize: 13, color: colors.textSecondary, marginTop: spacing.md }]}>
          🧠 Think（高性能モデル）
        </Text>
        {availableModels
          .filter((model) => model.category === 'think')
          .map((model) => {
            const isSelected = model.id === selectedModelId;
            const categoryStyle = getCategoryStyle(model.category);
            return (
              <TouchableOpacity
                key={model.id}
                style={[
                  styles.modelButton,
                  isSelected ? styles.modelButtonSelected : styles.modelButtonUnselected,
                  { borderColor: isSelected ? categoryStyle.color : colors.border, marginBottom: spacing.xs },
                ]}
                onPress={() => {
                  setSelectedModelId(model.id);
                  setCreditsToAllocate(Math.min(10, settings.tokenBalance.credits));
                }}
              >
                <MaterialCommunityIcons
                  name={categoryStyle.icon}
                  size={20}
                  color={isSelected ? categoryStyle.color : colors.textSecondary}
                />
                <View style={styles.modelButtonTextContainer}>
                  <Text
                    style={[
                      styles.modelButtonText,
                      { color: isSelected ? colors.text : colors.textSecondary },
                    ]}
                  >
                    {model.shortName}
                  </Text>
                  {model.recommended && (
                    <Text style={{ fontSize: 10, color: categoryStyle.color, marginLeft: spacing.xs }}>
                      (推奨)
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

      {/* クレジット入力 */}
      <View style={styles.sliderContainer}>
        <Text style={styles.sliderLabel}>配分するクレジット</Text>
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
      {selectedModel && (
        <View style={styles.capacityContainer}>
          <View style={styles.capacityHeader}>
            <Text style={styles.capacityLabel}>
              {selectedModel.category === 'quick' ? 'Quick' : 'Think'}カテゴリー容量
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
      )}

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
      </ScrollView>
    </CustomModal>
  );
};
