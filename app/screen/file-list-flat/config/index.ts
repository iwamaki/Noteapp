/**
 * @file config/index.ts
 * @summary file-list-flat機能の設定値を一元管理
 * @description
 * file-list-flat内で使用される全ての設定値（UI、レイアウト、インタラクション）を集約。
 * マジックナンバーを排除し、保守性とカスタマイズ性を向上。
 */

export const FILE_LIST_FLAT_CONFIG = {
  // ========================================
  // スペーシング設定
  // ========================================
  spacing: {
    /** 階層レベルごとのインデント幅（px） */
    indentPerLevel: 24,

    /** セクションヘッダーのパディング */
    sectionHeader: {
      vertical: 8,
      horizontal: 16,
    },

    /** 移動モードバーのパディング */
    moveBar: {
      vertical: 12,
      horizontal: 16,
    },

    /** バッジ共通スペーシング */
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      marginTop: 2,
      marginRight: 4, // spacing.xs 相当
    },

    /** カテゴリーボタンのスペーシング */
    categoryButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginRight: 8,
      marginBottom: 8,
    },

    /** メタデータコンテナ */
    metadataContainer: {
      marginTop: 4,
    },
  },

  // ========================================
  // フォントサイズ設定
  // ========================================
  typography: {
    /** 見出し（ラベルなど） */
    heading: 14,

    /** 本文 */
    body: 13,

    /** キャプション（小さめテキスト） */
    caption: 12,

    /** メッセージ（ファイルなし時など） */
    message: 16,
  },

  // ========================================
  // 色・透明度設定
  // ========================================
  appearance: {
    /** ボーダー色 */
    borderColor: '#e0e0e0',

    /** シャドウ色 */
    shadowColor: '#000',

    /** 透明度設定 */
    transparency: {
      /** バッジ背景の透明度（16進数で70%） */
      badgeAlpha: '70',

      /** シャドウの不透明度 */
      shadow: 0.1,

      /** タップ時のアクティブ不透明度 */
      active: 0.7,
    },
  },

  // ========================================
  // ボーダー・角丸設定
  // ========================================
  borderRadius: {
    /** バッジの角丸 */
    badge: 4,

    /** カテゴリーボタンの角丸 */
    categoryButton: 6,

    /** 影響範囲表示ボックスの角丸 */
    infoBox: 8,
  },

  // ========================================
  // レイアウト制限値
  // ========================================
  constraints: {
    /** コンテンツプレビューの最大表示行数 */
    contentPreviewMaxLines: 2,

    /** カテゴリーボタンの最大幅 */
    categoryButtonMaxWidth: 150,

    /** カテゴリー選択スクロールビューの最大高さ */
    categoryScrollMaxHeight: 70,
  },

  // ========================================
  // インタラクション設定
  // ========================================
  interaction: {
    /** タップ時の不透明度 */
    activeOpacity: 0.7,

    /** シャドウのオフセット */
    shadowOffset: {
      width: 0,
      height: -2,
    },

    /** シャドウのぼかし半径 */
    shadowRadius: 4,

    /** Android用の標高（elevation） */
    elevation: 5,
  },

  // ========================================
  // カテゴリー機能設定
  // ========================================
  category: {
    /** カテゴリーパスの区切り文字 */
    separatorChar: '/',

    /** 階層レベルによる背景色変化の設定 */
    colorChange: {
      /** レベルごとの変化係数 */
      multiplier: 0.15,

      /** 最大変化率（60%） */
      max: 0.6,
    },
  },

  // ========================================
  // 日付フォーマット設定
  // ========================================
  dateFormat: {
    /** タイムスタンプのフォーマット */
    timestamp: 'YYYY-MM-DD',

    /** ファイル名用の置換正規表現 */
    filenameSafeReplacement: /[:.]/g,
  },

  // ========================================
  // 機能フラグ（開発時にON/OFF切り替え）
  // ========================================
  features: {
    /** RAG機能（Q&A作成など）の有効/無効 */
    ragEnabled: false, // TODO: RAGが安定したらtrueに変更
  },
} as const;

// 型エクスポート（型安全性のため）
export type FileListFlatConfig = typeof FILE_LIST_FLAT_CONFIG;
