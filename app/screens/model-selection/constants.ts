/**
 * @file constants.ts
 * @summary モデル選択画面で使用する定数と型定義
 */

import type { LLMProvider } from '../../features/llmService/types/index';
import { logger } from '../../utils/logger';

export interface ModelInfo {
  id: string;
  name: string;
  shortName: string;
  description: string;
  category: 'quick' | 'think';
  recommended?: boolean;
}

/**
 * モデルIDから短縮名を生成（フォールバック用）
 * 例: "gemini-2.5-flash" → "2.5 Flash"
 *     "gpt-5-mini" → "5 Mini"
 */
export function formatShortName(modelId: string): string {
  const parts = modelId.split('-');
  // プロバイダー名（最初のパート）を除いた部分を大文字化
  return parts
    .slice(1)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * バックエンドから取得したLLMプロバイダー情報をModelInfo形式に変換
 *
 * メタデータがある場合はそれを使用し、ない場合はフォールバック処理を行う
 */
export function convertProvidersToModelInfo(
  providers: Record<string, LLMProvider>
): ModelInfo[] {
  const models: ModelInfo[] = [];

  // すべての利用可能なプロバイダーを処理
  Object.values(providers).forEach((provider) => {
    if (provider.status !== 'available') {
      return;
    }

    // 各モデルをModelInfo形式に変換
    provider.models.forEach((modelId) => {
      const metadata = provider.modelMetadata?.[modelId];

      if (metadata) {
        // バックエンドからメタデータが取得できた場合（推奨）
        models.push({
          id: modelId,
          name: metadata.displayName || modelId,
          shortName: formatShortName(modelId),
          description: metadata.description || '',
          category: metadata.category,
          recommended: metadata.recommended || false,
        });
      } else {
        // フォールバック: メタデータがない場合は従来のロジック
        logger.warn('llm', 'Model metadata not found, using fallback', { modelId });
        const category = modelId.toLowerCase().includes('flash') || modelId.toLowerCase().includes('mini') ? 'quick' : 'think';

        models.push({
          id: modelId,
          name: modelId,
          shortName: formatShortName(modelId),
          description: '',
          category,
          recommended: false,
        });
      }
    });
  });

  return models;
}
