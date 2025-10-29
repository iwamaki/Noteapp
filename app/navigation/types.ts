/**
 * @file types.ts
 * @summary このファイルは、アプリケーションのナビゲーションスタックで使用されるルートとパラメータの型定義を提供します。
 * @responsibility ナビゲーションの型安全性を保証し、各画面に渡されるデータの構造を定義する責任があります。
 */

export type RootStackParamList = {
  FileList: undefined;
  FileEdit: { fileId?: string; filename?: string; content?: string; saved?: boolean; initialViewMode?: 'edit' | 'preview' };
  Settings: undefined;
};