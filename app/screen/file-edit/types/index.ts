/**
 * @file types/index.ts
 * @summary ノート編集機能の統一された型定義
 * @description エディタの状態、エラー、アクションなどの型を一元管理
 */

import { File, FileVersion } from '@shared/types/file';

// ============================================
// エディタの状態型
// ============================================

/**
 * エディタの表示モード
 */
export type ViewMode = 'edit' | 'preview' | 'diff';

/**
 * エディタの状態を表す型
 */
export interface EditorState {
  file: File | null;
  content: string;
  title: string;
  isDirty: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: EditorError | null;
  viewMode: ViewMode;
}

// ============================================
// エラー型
// ============================================

/**
 * エラーコード
 */
export enum ErrorCode {
  SAVE_FAILED = 'SAVE_FAILED',
  LOAD_FAILED = 'LOAD_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  STORAGE_ERROR = 'STORAGE_ERROR',
}

/**
 * エディタのエラー情報
 */
export interface EditorError {
  code: ErrorCode;
  message: string;
  recoverable: boolean;
  retry?: () => Promise<any>;
}

// ============================================
// エディタのアクション型
// ============================================

/**
 * エディタの基本アクション
 */
export interface EditorActions {
  setContent: (content: string) => void;
  setTitle: (title: string) => void;
  save: () => Promise<void>;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  setViewMode: (mode: ViewMode) => void;
}

// ============================================
// 履歴管理型
// ============================================

/**
 * 履歴の状態
 */
export interface HistoryState {
  past: string[];
  present: string;
  future: string[];
  maxSize: number;
}

// ============================================
// バリデーション型
// ============================================

/**
 * バリデーションルール
 */
export interface ValidationRule {
  field: string;
  validate: (value: any) => boolean;
  message: string;
}

/**
 * バリデーション結果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ============================================
// 差分表示型
// ============================================

/**
 * 差分の種類
 */
export type DiffType = 'added' | 'removed' | 'unchanged';

/**
 * 差分情報
 */
export interface DiffResult {
  original: string;
  current: string;
  changes: DiffChange[];
}

/**
 * 差分の変更情報
 */
export interface DiffChange {
  type: DiffType;
  value: string;
  lineNumber?: number;
}

// ============================================
// Re-export shared types
// ============================================

export type { File, FileVersion };
