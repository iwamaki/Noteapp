/**
 * @file useModelSwitch.ts
 * @summary LLMモデル切り替えカスタムフック
 * @description
 * モデルの切り替えロジックを一箇所で管理し、
 * settingsStoreとAPIServiceの両方を適切に更新する。
 * このフックは以下の場所で使用される：
 * - MessageInput.tsx (quick/think切り替えボタン)
 * - ModelSelectionModal.tsx (チャット履歴モーダル)
 * - ModelSelectionScreen.tsx (設定画面のLLM詳細設定)
 */

import { useCallback } from 'react';
import { useTokenBalanceStore } from '../settingsStore';
import APIService from '../../features/llmService/api';
import { useLLMStore } from '../../features/llmService/stores/useLLMStore';
import { getProviderNameFromModelId } from '../../features/llmService/utils/providerHelper';

/**
 * モデル切り替えフックの戻り値
 */
interface UseModelSwitchReturn {
  /**
   * モデルを切り替える
   * @param category カテゴリー ('quick' または 'think')
   * @param modelId 新しいモデルID
   */
  switchModel: (category: 'quick' | 'think', modelId: string) => Promise<void>;
}

/**
 * LLMモデル切り替えフック
 *
 * settingsStoreとAPIServiceの両方を適切に更新することで、
 * UI表示と実際のLLM通信の両方が正しく同期されることを保証します。
 *
 * @example
 * ```tsx
 * const { switchModel } = useModelSwitch();
 *
 * // quick モデルに切り替え
 * await switchModel('quick', 'gemini-2.5-flash');
 *
 * // think モデルに切り替え
 * await switchModel('think', 'gemini-2.5-pro');
 * ```
 */
export function useModelSwitch(): UseModelSwitchReturn {
  const { loadModel } = useTokenBalanceStore();

  const switchModel = useCallback(
    async (category: 'quick' | 'think', modelId: string) => {
      // 1. settingsStoreを更新（UI状態とActiveStorageに保存）
      await loadModel(category, modelId);

      // 2. モデルIDからプロバイダー名を特定（Zustandストアから）
      const providers = useLLMStore.getState().getCachedProviders();
      const providerName = getProviderNameFromModelId(modelId, providers);

      if (!providerName) {
        console.error(`[useModelSwitch] Could not determine provider for model: ${modelId}`);
        // フォールバック: モデルだけ設定して続行
        APIService.setLLMModel(modelId);
        return;
      }

      // 3. APIServiceにプロバイダーとモデルを通知（実際のLLM通信に反映）
      APIService.setLLMProvider(providerName);
      APIService.setLLMModel(modelId);

      console.log(`[useModelSwitch] Switched to ${category} model: ${modelId} (provider: ${providerName})`);
    },
    [loadModel]
  );

  return { switchModel };
}
