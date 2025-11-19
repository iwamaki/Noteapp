/**
 * @file providerCache.ts
 * @summary LLMプロバイダー情報のキャッシュ管理
 * @description
 * プロバイダーキャッシュを独立したモジュールとして管理することで、
 * 循環参照を回避します。他のモジュールに依存しません。
 * @responsibility プロバイダー情報のキャッシュの保存と取得
 */

/**
 * プロバイダーキャッシュのシングルトン
 * グローバルな状態を保持し、循環参照を回避
 */
class ProviderCacheManager {
  private cache: Record<string, any> | null = null;

  /**
   * キャッシュを設定
   * @param providers プロバイダー情報
   */
  setCache(providers: Record<string, any> | null): void {
    this.cache = providers;
  }

  /**
   * キャッシュを取得
   * @returns プロバイダー情報（キャッシュがない場合はnull）
   */
  getCache(): Record<string, any> | null {
    return this.cache;
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache = null;
  }
}

// シングルトンインスタンスをエクスポート
export const providerCache = new ProviderCacheManager();
