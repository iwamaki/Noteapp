/**
 * @file systemSettings.types.ts
 * @summary システム/セキュリティ/その他設定の型定義
 */

export interface SystemSettings {
  // セキュリティ/ストレージ設定
  storageLocation: string;
  cloudSyncEnabled: boolean;
  exportFormat: 'markdown' | 'html' | 'pdf' | 'text';
  appLockEnabled: boolean;
  autoLockTimeout: number; // 分
  encryptSensitiveFiles: boolean;

  // その他
  cacheLimit: number; // MB
  offlineModeEnabled: boolean;
  updateNotifications: boolean;
  backupNotifications: boolean;

  // 開発者設定
  anonymousStatsEnabled: boolean;
  diagnosticDataEnabled: boolean;
}

export const defaultSystemSettings: SystemSettings = {
  storageLocation: 'default',
  cloudSyncEnabled: false,
  exportFormat: 'markdown',
  appLockEnabled: false,
  autoLockTimeout: 5,
  encryptSensitiveFiles: false,
  cacheLimit: 100,
  offlineModeEnabled: false,
  updateNotifications: true,
  backupNotifications: true,
  anonymousStatsEnabled: false,
  diagnosticDataEnabled: false,
};
