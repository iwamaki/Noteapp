/**
 * @file settingsPersistenceService.ts
 * @summary AsyncStorage操作を抽象化するサービスクラス
 * @responsibility 設定データの永続化（保存・読み込み）を一元管理
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_PREFIX = '@app_settings_';

export class SettingsPersistenceService {
  /**
   * 設定データを保存
   * @param key ストレージキー（プレフィックスなし）
   * @param data 保存するデータ
   */
  static async save<T>(key: string, data: T): Promise<void> {
    try {
      const fullKey = `${STORAGE_KEY_PREFIX}${key}`;
      await AsyncStorage.setItem(fullKey, JSON.stringify(data));
      console.log(`[SettingsPersistence] Saved: ${key}`);
    } catch (error) {
      console.error(`[SettingsPersistence] Failed to save ${key}:`, error);
      throw error;
    }
  }

  /**
   * 設定データを読み込み
   * @param key ストレージキー（プレフィックスなし）
   * @param defaultValue デフォルト値
   * @returns 読み込んだデータ、または存在しない場合はデフォルト値
   */
  static async load<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const fullKey = `${STORAGE_KEY_PREFIX}${key}`;
      const stored = await AsyncStorage.getItem(fullKey);

      if (stored) {
        const parsed = JSON.parse(stored);
        console.log(`[SettingsPersistence] Loaded: ${key}`);
        return { ...defaultValue, ...parsed }; // デフォルト値とマージ（新しいフィールド対応）
      }

      console.log(`[SettingsPersistence] No data found for ${key}, using defaults`);
      return defaultValue;
    } catch (error) {
      console.error(`[SettingsPersistence] Failed to load ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * 複数の設定データを一括保存（パフォーマンス最適化）
   * @param updates 保存するデータのマップ（キー: データ）
   */
  static async batchSave(updates: Record<string, any>): Promise<void> {
    try {
      const entries = Object.entries(updates).map(([key, data]) => [
        `${STORAGE_KEY_PREFIX}${key}`,
        JSON.stringify(data),
      ]);

      await AsyncStorage.multiSet(entries as [string, string][]);
      console.log(`[SettingsPersistence] Batch saved: ${Object.keys(updates).join(', ')}`);
    } catch (error) {
      console.error('[SettingsPersistence] Failed to batch save:', error);
      throw error;
    }
  }

  /**
   * 設定データを削除
   * @param key ストレージキー（プレフィックスなし）
   */
  static async remove(key: string): Promise<void> {
    try {
      const fullKey = `${STORAGE_KEY_PREFIX}${key}`;
      await AsyncStorage.removeItem(fullKey);
      console.log(`[SettingsPersistence] Removed: ${key}`);
    } catch (error) {
      console.error(`[SettingsPersistence] Failed to remove ${key}:`, error);
      throw error;
    }
  }

  /**
   * すべての設定データを削除
   */
  static async clear(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const settingsKeys = allKeys.filter(key => key.startsWith(STORAGE_KEY_PREFIX));

      if (settingsKeys.length > 0) {
        await AsyncStorage.multiRemove(settingsKeys);
        console.log(`[SettingsPersistence] Cleared all settings (${settingsKeys.length} keys)`);
      }
    } catch (error) {
      console.error('[SettingsPersistence] Failed to clear settings:', error);
      throw error;
    }
  }
}
