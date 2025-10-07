/**
 * @file index.ts
 * @summary ノート関連ストアの統合エクスポート
 * @description 3つのストア(noteStore, noteDraftStore, noteSelectionStore)をまとめて提供
 */

// DraftNote型は共通型ファイルから再エクスポート
export type { DraftNote } from '../../../shared/types/note';