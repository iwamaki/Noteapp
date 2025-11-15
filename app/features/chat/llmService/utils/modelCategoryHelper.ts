/**
 * @file modelCategoryHelper.ts
 * @summary Model category determination utilities
 * @description
 * モデルIDからカテゴリー（quick/think）を判定する純粋関数。
 * 循環参照を避けるため、他のモジュールに依存しません。
 * @responsibility プロバイダーメタデータまたはモデル名からカテゴリーを判定
 */

/**
 * プロバイダー情報の型（最小限の定義）
 */
export interface ProviderMetadata {
  modelMetadata?: {
    [modelId: string]: {
      category: 'quick' | 'think';
      [key: string]: any;
    };
  };
  [key: string]: any;
}

/**
 * モデルIDからカテゴリーを判定する純粋関数
 *
 * プロバイダーキャッシュがある場合はメタデータを使用し、
 * ない場合はモデル名から推測します。
 *
 * @param modelId モデルID（例: "gemini-2.5-flash", "gemini-2.5-pro"）
 * @param providersCache プロバイダーキャッシュ（オプション）
 * @returns カテゴリー（'quick' | 'think'）
 *
 * @example
 * ```typescript
 * // プロバイダーキャッシュを使用
 * const category = getModelCategoryFromId('gemini-2.5-flash', providers);
 *
 * // フォールバック判定（キャッシュなし）
 * const category = getModelCategoryFromId('gemini-2.5-flash');
 * ```
 */
export function getModelCategoryFromId(
  modelId: string,
  providersCache?: Record<string, ProviderMetadata> | null
): 'quick' | 'think' {
  // プロバイダーキャッシュがある場合はメタデータを使用
  if (providersCache) {
    for (const provider of Object.values(providersCache)) {
      if (provider?.modelMetadata?.[modelId]) {
        return provider.modelMetadata[modelId].category;
      }
    }
  }

  // フォールバック: モデル名から判定
  const modelIdLower = modelId.toLowerCase();
  return modelIdLower.includes('flash') || modelIdLower.includes('mini')
    ? 'quick'
    : 'think';
}
