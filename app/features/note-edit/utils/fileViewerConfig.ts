/**
 * @file fileViewerConfig.ts
 * @summary ファイル形式別の表示設定を定義します。
 */

// ファイルビューアの設定
export interface FileViewerConfig {
  extensions: string[];
  editable: boolean;
}

// ファイル形式別の設定
export const FILE_VIEWERS: Record<string, FileViewerConfig> = {
  text: { extensions: ['txt', 'log', 'cfg', 'ini'], editable: true },
  markdown: { extensions: ['md', 'markdown'], editable: true },
  code: { extensions: ['js', 'ts', 'py', 'java', 'c', 'cpp', 'css', 'html', 'json', 'xml', 'yaml', 'yml'], editable: true },
  image: { extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'], editable: false },
  pdf: { extensions: ['pdf'], editable: false },
  default: { extensions: [], editable: false },
};

/**
 * ファイル名から適切なビューア設定を取得
 */
export const getViewerConfig = (filename: string): FileViewerConfig => {
  if (!filename) return FILE_VIEWERS.default;
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return FILE_VIEWERS.default;

  for (const [, config] of Object.entries(FILE_VIEWERS)) {
    if (config.extensions.includes(ext)) {
      return config;
    }
  }
  return FILE_VIEWERS.default;
};
