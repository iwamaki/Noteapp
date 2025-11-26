/**
 * @file useModelSelection.ts
 * @summary モデル選択のビジネスロジックを管理するカスタムフック
 * @description モデル一覧の取得、選択状態、トークン残高の管理を行う
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTokenBalanceStore } from '../../settings/settingsStore';
import { convertProvidersToModelInfo, type ModelInfo } from '../../../screens/model-selection/constants';
import APIService from '../../llmService/api';
import { useModelSwitch } from '../../settings/hooks/useModelSwitch';
import { logger } from '../../../utils/logger';

interface UseModelSelectionProps {
  isVisible: boolean;
}

export const useModelSelection = ({ isVisible }: UseModelSelectionProps) => {
  const { t } = useTranslation();
  const { balance, loadedModels } = useTokenBalanceStore();
  const { switchModel } = useModelSwitch();

  // モデル一覧とローディング状態
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // モデル情報をバックエンドから取得
  useEffect(() => {
    if (!isVisible) return;

    const loadModels = async () => {
      try {
        setIsLoadingModels(true);
        setLoadError(null);

        // プロバイダー情報を取得（キャッシュがあれば即座に返る）
        const providers = await APIService.loadLLMProviders();

        // ModelInfo形式に変換
        const models = convertProvidersToModelInfo(providers);

        if (models.length === 0) {
          setLoadError(t('chat.modelSelection.error.noModels'));
        } else {
          setAvailableModels(models);
        }
      } catch (error) {
        logger.error('chat', 'Failed to load models:', { error });
        setLoadError(t('chat.modelSelection.error.loadFailed'));
      } finally {
        setIsLoadingModels(false);
      }
    };

    loadModels();
  }, [isVisible, t]);

  // 現在選択されているモデル
  const activeQuickModel = loadedModels.quick || 'gemini-2.5-flash';
  const activeThinkModel = loadedModels.think || 'gemini-2.5-pro';

  // モデルごとのトークン残高を取得
  const getModelTokens = (modelId: string): number => {
    return balance.allocatedTokens[modelId] || 0;
  };

  // モデル選択ハンドラー
  const handleSelectModel = async (modelId: string, category: 'quick' | 'think') => {
    const model = availableModels.find(m => m.id === modelId);
    if (!model) return;

    const tokens = getModelTokens(modelId);
    if (tokens <= 0) {
      return;
    }

    await switchModel(category, modelId);
  };

  // リトライハンドラー
  const handleRetry = () => {
    setIsLoadingModels(true);
    setLoadError(null);
  };

  return {
    availableModels,
    isLoadingModels,
    loadError,
    activeQuickModel,
    activeThinkModel,
    getModelTokens,
    handleSelectModel,
    handleRetry,
  };
};
