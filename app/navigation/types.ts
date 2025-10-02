/**
 * @file types.ts
 * @summary このファイルは、アプリケーションのナビゲーションスタックで使用されるルートとパラメータの型定義を提供します。
 * @responsibility ナビゲーションの型安全性を保証し、各画面に渡されるデータの構造を定義する責任があります。
 */

export type RootStackParamList = {
  NoteList: undefined;
  NoteEdit: { noteId?: string; filename?: string; content?: string; saved?: boolean };
  DiffView: {
    noteId?: string;
    versionId?: string;
    originalContent?: string;
    newContent?: string;
    mode?: 'restore' | 'save';
  } | undefined;
  VersionHistory: { noteId: string };
  Settings: undefined;
};