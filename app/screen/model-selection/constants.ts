/**
 * @file constants.ts
 * @summary モデル選択画面で使用する定数と型定義
 */

import type { LLMProvider } from '../../features/chat/llmService/types/types';

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
 */
export function formatShortName(modelId: string): string {
  const parts = modelId.split('-');
  // "gemini" を除いた部分を大文字化
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

  // Geminiプロバイダーのみを対象（将来的には他のプロバイダーにも対応可能）
  const geminiProvider = providers['gemini'];
  if (!geminiProvider || geminiProvider.status !== 'available') {
    return [];
  }

  // 各モデルをModelInfo形式に変換
  geminiProvider.models.forEach((modelId) => {
    const metadata = geminiProvider.modelMetadata?.[modelId];

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
      console.warn(`Model metadata not found for ${modelId}, using fallback`);
      const category = modelId.toLowerCase().includes('flash') ? 'quick' : 'think';

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

  return models;
}
