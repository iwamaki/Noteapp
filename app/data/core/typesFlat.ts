/**
 * @file typesFlat.ts
 * @summary フラット構造のデータ型定義
 * @description
 * フォルダ階層を廃止し、全ファイルをフラット構造で管理。
 * メタデータ（categories, tags）で整理。
 *
 * 主な特徴:
 * - Folder型なし（完全フラット）
 * - categories: 仮想フォルダとして機能
 * - tags: 柔軟な分類
 * - LLM生成フィールド（summary, relatedNoteIds, embedding）
 */

// =============================================================================
// Domain Types (実行時に使用する型)
// =============================================================================

/**
 * ファイル（フラット構造版）
 * - 全ファイルが同一階層に配置
 * - メタデータで意味づけ・整理
 */
export interface FileFlat {
  id: string;
  title: string;
  content: string;        // 実行時のみ保持（保存時は分離）

  // ユーザー管理のメタデータ
  tags: string[];         // ユーザー指定のタグ（例: ["重要", "TODO"]）
  categories: string[];   // 仮想フォルダとして使用（例: ["研究", "論文メモ"]）

  // LLM生成のメタデータ
  summary?: string;           // LLM生成の要約（短い概要）
  relatedNoteIds?: string[];  // LLM自動抽出の関連メモID
  embedding?: number[];       // セマンティック検索用（将来実装）

  // システムフィールド
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Metadata Types (FileSystemに保存する形式)
// =============================================================================

/**
 * ファイルメタデータ（フラット構造版）
 * {uuid}/meta.json として保存される
 */
export interface FileMetadataFlat {
  id: string;
  title: string;
  tags: string[];
  categories: string[];
  summary?: string;
  relatedNoteIds?: string[];
  embedding?: number[];
  createdAt: string;      // ISO string for JSON serialization
  updatedAt: string;      // ISO string
}

// =============================================================================
// Input Data Types (作成・更新用)
// =============================================================================

/**
 * ファイル作成データ（フラット構造版）
 */
export interface CreateFileDataFlat {
  title: string;
  content: string;
  tags?: string[];
  categories?: string[];
  summary?: string;           // 手動指定も可能（LLM生成を上書き）
  relatedNoteIds?: string[];  // 手動指定も可能
}

/**
 * ファイル更新データ（フラット構造版）
 */
export interface UpdateFileDataFlat {
  title?: string;
  content?: string;
  tags?: string[];
  categories?: string[];
  summary?: string;
  relatedNoteIds?: string[];
  embedding?: number[];
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * カテゴリー統計情報
 * UI表示用（カテゴリービュー）
 */
export interface CategoryInfo {
  name: string;           // カテゴリー名
  fileCount: number;      // このカテゴリーに属するファイル数
}

/**
 * タグ統計情報
 * UI表示用（タグクラウドなど）
 */
export interface TagInfo {
  name: string;           // タグ名
  fileCount: number;      // このタグを持つファイル数
}

/**
 * メタデータ検索オプション
 */
export interface MetadataSearchOptions {
  categories?: string[];  // 指定されたカテゴリーのいずれかに属する
  tags?: string[];        // 指定されたタグのいずれかを持つ
  searchText?: string;    // タイトルや内容でテキスト検索
}
