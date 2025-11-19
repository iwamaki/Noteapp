/**
 * @file editorSettings.types.ts
 * @summary エディタ設定の型定義
 */

export interface EditorSettings {
  // 起動設定
  startupScreen: 'file-list' | 'last-file' | 'new-file';
  defaultEditorMode: 'edit' | 'preview' | 'split';
  defaultFileViewScreen: 'edit' | 'preview';

  // 自動保存設定
  autoSaveEnabled: boolean;
  autoSaveInterval: number; // 秒

  // 編集機能
  autoIndent: boolean;
  tabSize: number;
  spellCheck: boolean;
  autoComplete: boolean;

  // バージョン管理/バックアップ設定
  versionSaveFrequency: 'every-change' | 'interval' | 'manual';
  versionSaveInterval: number; // 秒
  maxVersionCount: number;
  autoBackupEnabled: boolean;
  backupFrequency: number; // 時間
  backupLocation: 'local' | 'cloud';
  diffDisplayStyle: 'line' | 'char' | 'both';
  defaultDiffMode: 'inline' | 'side-by-side';
}

export const defaultEditorSettings: EditorSettings = {
  startupScreen: 'file-list',
  defaultEditorMode: 'edit',
  defaultFileViewScreen: 'edit',
  autoSaveEnabled: true,
  autoSaveInterval: 30,
  autoIndent: true,
  tabSize: 2,
  spellCheck: true,
  autoComplete: true,
  versionSaveFrequency: 'every-change',
  versionSaveInterval: 10,
  maxVersionCount: 50,
  autoBackupEnabled: true,
  backupFrequency: 24,
  backupLocation: 'local',
  diffDisplayStyle: 'both',
  defaultDiffMode: 'side-by-side',
};
