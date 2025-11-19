/**
 * @file types.ts
 * @summary このファイルは、アプリケーションのナビゲーションスタックで使用されるルートとパラメータの型定義を提供します。
 * @responsibility ナビゲーションの型安全性を保証し、各画面に渡されるデータの構造を定義する責任があります。
 */

/**
 * ルートスタックのパラメータリスト
 *
 * 画面構成：
 * - FileList: ファイル一覧画面（メイン画面）
 * - FileEdit: ファイル編集画面
 * - Settings: 設定のトップ画面
 * - TokenPurchase: トークン購入画面（Settingsから遷移）
 * - ModelSelection: モデル選択画面（Settingsから遷移）
 *
 * 画面遷移フロー：
 * FileList ↔ FileEdit: ファイルの編集
 * FileList → Settings: 設定を開く
 * Settings → TokenPurchase: トークン購入
 * Settings → ModelSelection: モデル選択
 */
export type RootStackParamList = {
  /** ファイル一覧画面（メイン画面） */
  FileList: undefined;

  /** ファイル編集画面 */
  FileEdit: {
    /** ファイルID（既存ファイルの場合） */
    fileId?: string;
    /** ファイル名 */
    filename?: string;
    /** 初期コンテンツ */
    content?: string;
    /** 保存状態 */
    saved?: boolean;
    /** 初期表示モード */
    initialViewMode?: 'edit' | 'preview'
  };

  /** 設定のトップ画面 */
  Settings: undefined;

  /** トークン購入画面（Settingsから遷移） */
  TokenPurchase: undefined;

  /** モデル選択画面（Settingsから遷移） */
  ModelSelection: undefined;
};