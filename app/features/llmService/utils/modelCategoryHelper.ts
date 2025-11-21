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
 * プロバイダーキャッシュのメタデータからカテゴリーを取得します。
 * カテゴリーが見つからない場合はエラーをスローします。
 *
 * @param modelId モデルID（例: "gemini-2.5-flash", "gemini-2.5-pro"）
 * @param providersCache プロバイダーキャッシュ（必須）
 * @returns カテゴリー（'quick' | 'think'）
 * @throws {Error} プロバイダーキャッシュがないか、モデルが見つからない場合
 *
 * @example
 * ```typescript
 * // プロバイダーキャッシュを使用
 * const category = getModelCategoryFromId('gemini-2.5-flash', providers);
 * ```
 */
export function getModelCategoryFromId(
  modelId: string,
  providersCache?: Record<string, ProviderMetadata> | null
): 'quick' | 'think' {
  // プロバイダーキャッシュの確認
  if (!providersCache) {
    throw new Error(
      `Cannot determine category for model "${modelId}": Provider cache not loaded`
    );
  }

  // プロバイダーキャッシュからメタデータを検索
  for (const provider of Object.values(providersCache)) {
    if (provider?.modelMetadata?.[modelId]) {
      return provider.modelMetadata[modelId].category;
    }
  }

  // モデルが見つからない場合はエラー
  throw new Error(
    `Cannot determine category for model "${modelId}": Model not found in provider metadata`
  );
}
