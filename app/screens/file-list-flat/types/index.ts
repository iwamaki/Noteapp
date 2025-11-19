/**
 * @file types/index.ts
 * @summary file-list-flat フォルダの共通型定義
 * @description
 * コンポーネント、フック、ストアで使用する型を一元管理。
 * 型の重複を防ぎ、保守性と再利用性を向上。
 *
 * @example
 * import { CategoryInfo, FileActionsModalProps } from './types';
 */

import React from 'react';
import { FileFlat } from '@data/core/typesFlat';
import { CategoryImpact } from '@data/services/categoryOperationsService';

// =============================================================================
// カテゴリー関連の型
// =============================================================================

/**
 * カテゴリーの基本情報
 * カテゴリーパスと表示名を含む
 */
export interface CategoryInfo {
  /** カテゴリーのフルパス（例: "研究/AI/深層学習"） */
  path: string;
  /** カテゴリーの表示名（例: "深層学習"） */
  name: string;
}

/**
 * カテゴリーアクション用の情報
 * 基本情報に加えて、カテゴリー内のファイル数を含む
 */
export interface CategoryActionInfo extends CategoryInfo {
  /** カテゴリー内のファイル数 */
  fileCount: number;
}

/**
 * カテゴリー削除用の情報
 * 基本情報に加えて、削除の影響範囲を含む
 */
export interface CategoryDeleteInfo extends CategoryInfo {
  /** 削除の影響範囲（影響を受けるファイル数など） */
  impact: CategoryImpact;
}

// =============================================================================
// モーダル関連の型
// =============================================================================

/**
 * モーダルコンポーネントの基本Props
 * すべてのモーダルが共通で持つプロパティ
 */
export interface BaseModalProps {
  /** モーダルの表示状態 */
  visible: boolean;
  /** モーダルを閉じる際のコールバック */
  onClose: () => void;
}

/**
 * ファイルアクションモーダルのProps
 */
export interface FileActionsModalProps extends BaseModalProps {
  /** 操作対象のファイル */
  file: FileFlat | null;
  /** ファイル削除アクション */
  onDelete: (file: FileFlat) => void;
  /** ファイルコピーアクション */
  onCopy: (file: FileFlat) => void;
  /** ファイルリネームアクション */
  onRename: (file: FileFlat) => void;
  /** カテゴリー編集アクション */
  onEditCategories: (file: FileFlat) => void;
  /** タグ編集アクション */
  onEditTags: (file: FileFlat) => void;
  /** ファイル移動アクション */
  onMove: (file: FileFlat) => void;
  /** チャットに添付アクション */
  onAttachToChat: (file: FileFlat) => void;
  /** ファイルエクスポートアクション */
  onExport: (file: FileFlat) => void;
}

/**
 * カテゴリーアクションモーダルのProps
 */
export interface CategoryActionsModalProps extends BaseModalProps {
  /** カテゴリーパス */
  categoryPath: string | null;
  /** カテゴリー名 */
  categoryName: string | null;
  /** カテゴリー内のファイル数 */
  fileCount: number;
  /** カテゴリー削除アクション */
  onDelete: (categoryPath: string) => void;
  /** カテゴリーリネームアクション */
  onRename: (categoryPath: string) => void;
  /** カテゴリーエクスポートアクション */
  onExport: (categoryPath: string) => void;
  /** Q&A作成アクション */
  onCreateQA: (categoryPath: string, categoryName: string) => void;
}

/**
 * ファイル作成モーダルのProps
 */
export interface CreateFileModalProps extends BaseModalProps {
  /** ファイル作成時のコールバック */
  onCreate: (title: string, category: string, tags: string[]) => void;
}

/**
 * カテゴリー編集モーダルのProps
 */
export interface CategoryEditModalProps extends BaseModalProps {
  /** 初期カテゴリー値 */
  initialCategory: string;
  /** ファイル名（表示用） */
  fileName: string;
  /** カテゴリー保存時のコールバック */
  onSave: (category: string) => void;
}

/**
 * タグ編集モーダルのProps
 */
export interface TagEditModalProps extends BaseModalProps {
  /** 初期タグ配列 */
  initialTags: string[];
  /** ファイル名（表示用） */
  fileName: string;
  /** タグ保存時のコールバック */
  onSave: (tags: string[]) => void;
}

/**
 * リネームモーダルのProps
 */
export interface RenameItemModalProps extends BaseModalProps {
  /** 初期名前 */
  initialName: string;
  /** リネーム時のコールバック */
  onRename: (newName: string) => void;
}

/**
 * カテゴリーリネームモーダルのProps
 */
export interface CategoryRenameModalProps extends BaseModalProps {
  /** カテゴリーのフルパス */
  categoryPath: string;
  /** カテゴリーの現在の名前 */
  categoryName: string;
  /** リネームの影響範囲 */
  impact: CategoryImpact | null;
  /** リネーム時のコールバック（新しいパスを渡す） */
  onRename: (newPath: string) => void;
}

// =============================================================================
// Hook返り値の型
// =============================================================================

/**
 * useImportExport フックの返り値型
 */
export interface UseImportExportReturn {
  /** 処理中フラグ */
  isProcessing: boolean;
  /** 全ファイルエクスポート */
  handleExport: () => Promise<void>;
  /** 単一ファイルエクスポート */
  handleExportFile: (fileId: string) => Promise<void>;
  /** カテゴリーエクスポート */
  handleExportCategory: (categoryPath: string) => Promise<void>;
  /** ファイルインポート */
  handleImport: () => Promise<void>;
}

/**
 * useRAGSync フックの返り値型
 */
export interface UseRAGSyncReturn {
  /** 同期中フラグ */
  isSyncing: boolean;
  /** カテゴリーをRAGに同期 */
  syncCategoryToRAG: (categoryPath: string, categoryName: string) => Promise<void>;
}

/**
 * useFileListHeader フックの返り値型
 */
export interface UseFileListHeaderReturn {
  /** ヘッダーの右側に表示するボタン */
  headerRight: () => React.ReactElement;
}
