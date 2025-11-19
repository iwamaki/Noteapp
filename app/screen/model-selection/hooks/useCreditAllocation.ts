/**
 * @file useCreditAllocation.ts
 * @summary クレジット配分のロジックを管理するカスタムフック
 */

import { useState, useMemo, useEffect } from 'react';
import { Alert } from 'react-native';
import { useSettingsStore, TOKEN_CAPACITY_LIMITS } from '../../../settings/settingsStore';
import { creditsToTokens, getTokenPrice } from '../../../billing/constants/tokenPricing';
import APIService from '../../../features/llmService/api';
import { convertProvidersToModelInfo, type ModelInfo } from '../constants';

interface UseCreditAllocationProps {
  isVisible: boolean;
  initialModelId?: string;
  onClose: () => void;
}

export const useCreditAllocation = ({
  isVisible,
  initialModelId,
  onClose,
}: UseCreditAllocationProps) => {
  const { settings, refreshTokenBalance, getTotalTokensByCategory } = useSettingsStore();

  // State
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [isLoadingModel, setIsLoadingModel] = useState(true);
  const [creditsToAllocate, setCreditsToAllocate] = useState<number>(
    Math.min(10, settings.tokenBalance.credits)
  );
  const [isAllocating, setIsAllocating] = useState(false);

  // モデル情報を取得
  useEffect(() => {
    const loadModel = async () => {
      if (!initialModelId || !isVisible) return;

      try {
        setIsLoadingModel(true);
        const providers = await APIService.loadLLMProviders();
        const models = convertProvidersToModelInfo(providers);
        const model = models.find((m) => m.id === initialModelId);

        if (!model) {
          Alert.alert('エラー', 'モデル情報が見つかりません');
          onClose();
          return;
        }

        setModelInfo(model);
      } catch (error) {
        console.error('Failed to load model:', error);
        Alert.alert('エラー', 'モデル情報の読み込みに失敗しました');
        onClose();
      } finally {
        setIsLoadingModel(false);
      }
    };

    loadModel();
  }, [isVisible, initialModelId]);

  // カテゴリーごとの色とアイコン
  const getCategoryStyle = (category: 'quick' | 'think') => {
    return category === 'quick'
      ? { color: '#FFC107', icon: 'speedometer' as const, label: 'Quick' }
      : { color: '#4CAF50', icon: 'speedometer-slow' as const, label: 'Think' };
  };

  // クレジット→トークン変換
  const convertedTokens = useMemo(() => {
    if (!initialModelId) return 0;
    return creditsToTokens(initialModelId, creditsToAllocate);
  }, [initialModelId, creditsToAllocate]);

  // 容量制限チェック
  const capacityInfo = useMemo(() => {
    if (!modelInfo) {
      return {
        currentTotal: 0,
        newTotal: 0,
        limit: 0,
        remaining: 0,
        isOverLimit: false,
        usagePercent: 0,
      };
    }

    const category = modelInfo.category;
    const currentTotal = getTotalTokensByCategory(category);
    const limit = TOKEN_CAPACITY_LIMITS[category];
    const newTotal = currentTotal + convertedTokens;
    const remaining = limit - currentTotal;

    return {
      currentTotal,
      newTotal,
      limit,
      remaining,
      isOverLimit: newTotal > limit,
      usagePercent: Math.min(100, (newTotal / limit) * 100),
    };
  }, [modelInfo, getTotalTokensByCategory, settings.tokenBalance.allocatedTokens, convertedTokens]);

  // 最大配分可能クレジット
  const maxAllocatableCredits = useMemo(() => {
    if (!initialModelId) return settings.tokenBalance.credits;

    const pricePerMToken = getTokenPrice(initialModelId);
    if (!pricePerMToken) return settings.tokenBalance.credits;

    const maxTokens = capacityInfo.remaining;
    const maxCredits = Math.floor((maxTokens / 1_000_000) * pricePerMToken);
    return Math.min(settings.tokenBalance.credits, maxCredits);
  }, [initialModelId, capacityInfo.remaining, settings.tokenBalance.credits]);

  // 配分実行
  const handleAllocate = async () => {
    if (!modelInfo) {
      Alert.alert('エラー', 'モデル情報が読み込まれていません');
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
      // バックエンドにクレジットを配分
      const { getBillingApiService } = await import('../../../billing/services/billingApiService');
      const billingService = getBillingApiService();
      await billingService.allocateCredits([
        {
          modelId: modelInfo.id,
          credits: creditsToAllocate,
        },
      ]);

      // ローカルキャッシュを更新
      await refreshTokenBalance();

      Alert.alert(
        '✅ 配分完了',
        `${creditsToAllocate}Pのクレジットを\n${modelInfo.name}に配分しました\n\n${convertedTokens.toLocaleString()}トークンが追加されました`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error: any) {
      console.error('[CreditAllocationModal] Allocation error:', error);
      Alert.alert('エラー', error.message || '配分中にエラーが発生しました');
    } finally {
      setIsAllocating(false);
    }
  };

  const categoryStyle = modelInfo ? getCategoryStyle(modelInfo.category) : null;

  return {
    // State
    modelInfo,
    isLoadingModel,
    creditsToAllocate,
    isAllocating,
    categoryStyle,

    // Computed
    convertedTokens,
    capacityInfo,
    maxAllocatableCredits,

    // Actions
    setCreditsToAllocate,
    handleAllocate,

    // Store
    settings,
  };
};
