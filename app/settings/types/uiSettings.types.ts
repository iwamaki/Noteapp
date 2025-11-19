/**
 * @file uiSettings.types.ts
 * @summary UI/表示設定の型定義
 */

export interface UISettings {
  // テーマとカラー
  theme: 'light' | 'dark' | 'system';
  highContrastMode: boolean;

  // フォント設定
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  fontFamily: string;
  lineSpacing: number;

  // 表示オプション
  showLineNumbers: boolean;
  syntaxHighlight: boolean;
  showMarkdownSymbols: boolean;
  screenReaderOptimization: boolean;

  // ファイルリスト表示設定
  categorySortMethod: 'name' | 'fileCount';
  fileSortMethod: 'updatedAt' | 'name';
  showSummary: boolean;
}

export const defaultUISettings: UISettings = {
  theme: 'system',
  highContrastMode: false,
  fontSize: 'medium',
  fontFamily: 'System',
  lineSpacing: 1.5,
  showLineNumbers: false,
  syntaxHighlight: true,
  showMarkdownSymbols: true,
  screenReaderOptimization: false,
  categorySortMethod: 'fileCount',
  fileSortMethod: 'updatedAt',
  showSummary: true,
};
