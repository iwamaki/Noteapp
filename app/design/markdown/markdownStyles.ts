/**
 * @file markdownStyles.ts
 * @summary マークダウンレンダリングの共通スタイル定義
 * @description react-native-markdown-displayで使用するテーマ対応のスタイルを提供します
 *
 * 対処している問題:
 * 1. ダークテーマでコードブロックのテキストが白いまま → テーマカラーを適用
 * 2. テキストの末尾が消える → 適切なパディング・マージンを追加
 */

import { TextStyle } from 'react-native';

/**
 * テーマカラーの型定義
 */
interface ThemeColors {
  text: string;
  textSecondary: string;
  background: string;
  secondary: string;
  primary: string;
  border: string;
  tertiary: string;
}

/**
 * タイポグラフィの型定義
 */
interface Typography {
  body: {
    fontSize: number;
    lineHeight: number;
  };
  title: {
    fontSize: number;
    lineHeight: number;
    fontWeight: string;
  };
  subtitle: {
    fontSize: number;
    lineHeight: number;
    fontWeight: string;
  };
  caption: {
    fontSize: number;
    lineHeight: number;
  };
}

/**
 * マークダウンスタイル生成のオプション
 */
interface MarkdownStyleOptions {
  colors: ThemeColors;
  typography: Typography;
  textColor?: string; // カスタムテキストカラー（メッセージタイプごとに異なる色を使う場合）
}

/**
 * テーマに応じたマークダウンスタイルを生成
 *
 * @param options - スタイル生成オプション
 * @returns react-native-markdown-display用のスタイルオブジェクト
 */
export const getMarkdownStyles = (options: MarkdownStyleOptions) => {
  const { colors, typography, textColor } = options;
  const effectiveTextColor = textColor || colors.text;

  return {
    // 本文の基本スタイル
    body: {
      color: effectiveTextColor,
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      // テキストの末尾が消える問題に対処: 十分な余白を確保
      paddingTop: 0,
      paddingBottom: 0,
    } as TextStyle,

    // 見出しスタイル
    heading1: {
      color: effectiveTextColor,
      fontSize: typography.body.fontSize * 1.8,
      lineHeight: typography.body.lineHeight * 1.8,
      fontWeight: 'bold' as any,
      marginTop: 12,
      marginBottom: 10,
    } as TextStyle,

    heading2: {
      color: effectiveTextColor,
      fontSize: typography.body.fontSize * 1.5,
      lineHeight: typography.body.lineHeight * 1.5,
      fontWeight: 'bold' as any,
      marginTop: 16,
      marginBottom: 8,
    } as TextStyle,

    heading3: {
      color: effectiveTextColor,
      fontSize: typography.body.fontSize * 1.3,
      lineHeight: typography.body.lineHeight * 1.3,
      fontWeight: 'bold' as any,
      marginTop: 14,
      marginBottom: 6,
    } as TextStyle,

    heading4: {
      color: effectiveTextColor,
      fontSize: typography.body.fontSize * 1.15,
      lineHeight: typography.body.lineHeight * 1.15,
      fontWeight: '600' as any,
      marginTop: 12,
      marginBottom: 5,
    } as TextStyle,

    heading5: {
      color: effectiveTextColor,
      fontSize: typography.body.fontSize * 1.05,
      lineHeight: typography.body.lineHeight * 1.05,
      fontWeight: '600' as any,
      marginTop: 10,
      marginBottom: 4,
    } as TextStyle,

    heading6: {
      color: effectiveTextColor,
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      fontWeight: '600' as any,
      marginTop: 8,
      marginBottom: 3,
    } as TextStyle,

    // 段落スタイル - テキストの末尾が消える問題に対処
    paragraph: {
      marginTop: 0,
      marginBottom: 0,
      paddingRight: 4, // 右端のテキストが切れないように
    } as TextStyle,

    // インラインコードスタイル - ダークテーマ対応
    code_inline: {
      backgroundColor: colors.secondary,
      color: colors.primary, // テーマのプライマリカラーを使用
      fontFamily: 'monospace',
      fontSize: typography.body.fontSize * 0.9,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 3,
    } as TextStyle,

    // コードブロックスタイル - ダークテーマ対応
    code_block: {
      backgroundColor: colors.secondary,
      color: effectiveTextColor, // テーマに応じたテキスト色
      fontFamily: 'monospace',
      fontSize: typography.body.fontSize * 0.85,
      padding: 12,
      borderRadius: 6,
      marginVertical: 8,
      borderWidth: 1,
      borderColor: colors.border,
      // テキストの末尾が消える問題に対処
      paddingRight: 16,
    } as TextStyle,

    // フェンスコードブロック（```で囲まれたコード）
    fence: {
      backgroundColor: colors.secondary,
      color: effectiveTextColor, // テーマに応じたテキスト色
      fontFamily: 'monospace',
      fontSize: typography.body.fontSize * 0.85,
      padding: 12,
      borderRadius: 6,
      marginVertical: 8,
      borderWidth: 1,
      borderColor: colors.border,
      // テキストの末尾が消える問題に対処
      paddingRight: 16,
    } as TextStyle,

    // リストアイテム
    list_item: {
      marginVertical: 2,
      // テキストの末尾が消える問題に対処
      paddingRight: 4,
    } as TextStyle,

    // 順序なしリスト
    bullet_list: {
      marginVertical: 4,
    } as TextStyle,

    // 順序付きリスト
    ordered_list: {
      marginVertical: 4,
    } as TextStyle,

    // 引用ブロック
    blockquote: {
      backgroundColor: colors.secondary + '80', // 透明度を追加
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      paddingLeft: 12,
      paddingRight: 12,
      paddingVertical: 8,
      marginVertical: 8,
      fontStyle: 'italic' as const,
    } as TextStyle,

    // リンク
    link: {
      color: colors.primary,
      textDecorationLine: 'underline' as const,
    } as TextStyle,

    // 太字
    strong: {
      fontWeight: 'bold' as any,
      color: effectiveTextColor,
    } as TextStyle,

    // イタリック
    em: {
      fontStyle: 'italic' as const,
      color: effectiveTextColor,
    } as TextStyle,

    // 取り消し線
    del: {
      textDecorationLine: 'line-through' as const,
      color: colors.textSecondary,
    } as TextStyle,

    // 水平線
    hr: {
      backgroundColor: colors.tertiary,
      height: 1,
      marginVertical: 12,
    } as TextStyle,

    // テーブル関連
    table: {
      borderWidth: 1,
      borderColor: colors.tertiary,
      marginVertical: 8,
    } as TextStyle,

    thead: {
      backgroundColor: colors.secondary,
    } as TextStyle,

    th: {
      padding: 8,
      borderWidth: 1,
      borderColor: colors.tertiary,
      fontWeight: 'bold' as any,
      color: effectiveTextColor,
    } as TextStyle,

    td: {
      padding: 8,
      borderWidth: 1,
      borderColor: colors.tertiary,
      color: effectiveTextColor,
    } as TextStyle,

    tr: {
      borderBottomWidth: 1,
      borderColor: colors.tertiary,
    } as TextStyle,
  };
};
