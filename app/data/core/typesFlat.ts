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
 * コンテンツタイプ（テキスト or バイナリ）
 */
export type ContentType = 'text' | 'binary';

/**
 * サポートされるMIMEタイプ
 */
export type SupportedMimeType =
  | 'text/plain'
  | 'text/markdown'
  | 'text/html'
  | 'image/png'
  | 'image/jpeg'
  | 'image/gif'
  | 'image/webp'
  | 'image/svg+xml'
  | 'application/pdf'
  | 'application/octet-stream';

/**
 * ファイル（フラット構造版）
 * - 全ファイルが同一階層に配置
 * - メタデータで意味づけ・整理
 * - テキスト/バイナリ両対応
 */
export interface FileFlat {
  id: string;
  title: string;
  content: string;        // 実行時のみ保持（保存時は分離）。バイナリはbase64エンコード

  // コンテンツタイプ情報
  contentType?: ContentType;      // 'text' | 'binary'（デフォルト: 'text'）
  mimeType?: SupportedMimeType;   // MIMEタイプ（例: 'image/png'）

  // ユーザー管理のメタデータ
  tags: string[];         // ユーザー指定のタグ（例: ["重要", "TODO"]）
  category: string;       // 階層パス形式のカテゴリー（例: "研究/AI/深層学習"）
  order?: number;         // カテゴリー内での並び順（同じカテゴリー内でのみ有効）

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
  contentType?: ContentType;      // 'text' | 'binary'
  mimeType?: SupportedMimeType;   // MIMEタイプ
  tags: string[];
  category: string;
  order?: number;
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
  content: string;            // バイナリの場合はbase64エンコード済み
  contentType?: ContentType;  // 'text' | 'binary'（デフォルト: 'text'）
  mimeType?: SupportedMimeType;
  tags?: string[];
  category?: string;
  summary?: string;           // 手動指定も可能（LLM生成を上書き）
  relatedNoteIds?: string[];  // 手動指定も可能
}

/**
 * ファイル更新データ（フラット構造版）
 */
export interface UpdateFileDataFlat {
  title?: string;
  content?: string;           // バイナリの場合はbase64エンコード済み
  contentType?: ContentType;  // 'text' | 'binary'
  mimeType?: SupportedMimeType;
  tags?: string[];
  category?: string;
  order?: number;
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
  category?: string;      // 指定されたカテゴリーに属する（階層パス）
  tags?: string[];        // 指定されたタグのいずれかを持つ
  searchText?: string;    // タイトルや内容でテキスト検索
}

/**
 * カテゴリーでグループ化されたファイルセクション
 * UI表示用（SectionListのデータ構造）
 * Phase 1: フラットなグルーピング
 */
export interface FileCategorySection {
  category: string;       // カテゴリー名（"未分類"を含む）
  fileCount: number;      // このセクション内のファイル数
  files: FileFlat[];      // セクション内のファイル配列
}

/**
 * カテゴリーでグループ化されたファイルセクション（階層構造対応）
 * UI表示用（SectionListのデータ構造）
 * Phase 2: 階層的グルーピング
 *
 * @example
 * // 親カテゴリー
 * { category: "研究", fullPath: "研究", level: 0, parent: null, fileCount: 5, directFiles: [...] }
 *
 * // サブカテゴリー
 * { category: "AI", fullPath: "研究/AI", level: 1, parent: "研究", fileCount: 2, directFiles: [...] }
 */
export interface FileCategorySectionHierarchical {
  category: string;          // 表示用カテゴリー名: "研究" or "AI"
  fullPath: string;          // 完全パス: "研究" or "研究/AI"
  level: number;             // 0=親, 1=サブ, 2=サブサブ...
  parent: string | null;     // 親カテゴリーの完全パス: null or "研究"
  fileCount: number;         // このカテゴリー配下の総ファイル数
  directFiles: FileFlat[];   // 直接このカテゴリーに属するファイル
}

// =============================================================================
// Line-based Content Types
// =============================================================================

/**
 * ファイルコンテンツの1行を表す
 * - エディタやLLMによる行単位の編集を可能にするための基本単位
 * - 改行コード（\r\n, \n, \r）は除去され、純粋な行内容のみを保持
 */
export interface FileLine {
  lineNumber: number;     // 1-based行番号（エディタ表示に対応）
  content: string;        // 改行コードを除いた行の内容
}

/**
 * ファイルの全コンテンツを行の配列として表現
 * - 行単位での編集、差分表示、AIによる部分修正などの高度な編集機能の基盤
 * - content: stringの代替ではなく、補完的なビュー
 */
export interface FileContentLines {
  fileId: string;         // ファイルID
  totalLines: number;     // 総行数
  lines: FileLine[];      // 行の配列
}

// =============================================================================
// Content Type Utilities
// =============================================================================

/**
 * 拡張子からMIMEタイプを推定
 */
export const getMimeTypeFromExtension = (filename: string): SupportedMimeType => {
  const ext = filename.toLowerCase().split('.').pop() || '';
  const mimeMap: Record<string, SupportedMimeType> = {
    // テキスト系
    'txt': 'text/plain',
    'md': 'text/markdown',
    'markdown': 'text/markdown',
    'html': 'text/html',
    'htm': 'text/html',
    // 画像系
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    // その他
    'pdf': 'application/pdf',
  };
  return mimeMap[ext] || 'application/octet-stream';
};

/**
 * MIMEタイプからコンテンツタイプを判定
 */
export const getContentTypeFromMime = (mimeType: SupportedMimeType): ContentType => {
  if (mimeType.startsWith('text/')) {
    return 'text';
  }
  return 'binary';
};

/**
 * ファイルがテキストコンテンツかどうかを判定
 */
export const isTextContent = (file: FileFlat): boolean => {
  return file.contentType !== 'binary';
};

/**
 * ファイルが画像かどうかを判定
 */
export const isImageContent = (file: FileFlat): boolean => {
  return file.mimeType?.startsWith('image/') ?? false;
};

/**
 * ファイルがPDFかどうかを判定
 */
export const isPdfContent = (file: FileFlat): boolean => {
  return file.mimeType === 'application/pdf';
};
