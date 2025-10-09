/**
 * @file ProviderManager.ts
 * @summary プロバイダーとモデルの管理
 * @responsibility LLMプロバイダーとモデルの状態管理、デフォルト値の設定
 */

import type { LLMProvider } from './types';

export interface ProviderManagerConfig {
  defaultProvider?: string;
  defaultModel?: string;
}

/**
 * プロバイダーとモデルの管理クラス
 */
export class ProviderManager {
  private availableProviders: Record<string, LLMProvider> = {};
  private currentProvider: string;
  private currentModel: string;

  constructor(config: ProviderManagerConfig = {}) {
    this.currentProvider = config.defaultProvider || 'openai';
    this.currentModel = config.defaultModel || 'gpt-3.5-turbo';
  }

  /**
   * 利用可能なプロバイダーを設定
   */
  setAvailableProviders(providers: Record<string, LLMProvider>): void {
    this.availableProviders = providers;

    // デフォルトモデルを設定（現在のプロバイダーにモデルが設定されていない場合）
    if (!this.currentModel && this.availableProviders[this.currentProvider]) {
      this.currentModel = this.availableProviders[this.currentProvider].defaultModel;
    }
  }

  /**
   * 現在のプロバイダーを設定
   */
  setProvider(provider: string): void {
    this.currentProvider = provider;

    // プロバイダー変更時にデフォルトモデルを設定
    if (this.availableProviders[provider]) {
      this.currentModel = this.availableProviders[provider].defaultModel;
    }
  }

  /**
   * 現在のモデルを設定
   */
  setModel(model: string): void {
    this.currentModel = model;
  }

  /**
   * 現在のプロバイダーを取得
   */
  getCurrentProvider(): string {
    return this.currentProvider;
  }

  /**
   * 現在のモデルを取得
   */
  getCurrentModel(): string {
    return this.currentModel;
  }

  /**
   * 利用可能なプロバイダーを取得
   */
  getAvailableProviders(): Record<string, LLMProvider> {
    return this.availableProviders;
  }

  /**
   * 指定したプロバイダーが利用可能かチェック
   */
  isProviderAvailable(provider: string): boolean {
    return !!this.availableProviders[provider];
  }

  /**
   * 指定したモデルが現在のプロバイダーで利用可能かチェック
   */
  isModelAvailable(model: string): boolean {
    const provider = this.availableProviders[this.currentProvider];
    return provider ? provider.models.includes(model) : false;
  }
}
