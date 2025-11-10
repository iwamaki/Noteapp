/**
 * @file MarkdownRenderer.tsx
 * @summary 共通マークダウンレンダリングコンポーネント
 * @description テーマ対応のマークダウンレンダリングを提供します
 *
 * 使用例:
 * ```tsx
 * <MarkdownRenderer content={text} />
 * <MarkdownRenderer content={text} textColor="#ffffff" />
 * ```
 */

import React, { useMemo } from 'react';
import Markdown from 'react-native-markdown-display';
import { useTheme } from '../theme/ThemeContext';
import { getMarkdownStyles } from './markdownStyles';
import { getMarkdownRules } from './markdownRules';

interface MarkdownRendererProps {
  /** レンダリングするマークダウンテキスト */
  content: string;
  /** カスタムテキストカラー（オプション） */
  textColor?: string;
  /** 画像の最大幅（オプション、デフォルトは画面幅の80%） */
  maxImageWidth?: number;
}

/**
 * マークダウンレンダリングコンポーネント
 *
 * 特徴:
 * - テーマに自動対応（ダークモード/ライトモード）
 * - コードブロックのテーマ対応（色が正しく表示される）
 * - テキストの末尾が消える問題に対処
 * - カスタムテキストカラーをサポート（チャットメッセージ等で使用）
 *
 * @param props - コンポーネントのプロパティ
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  textColor,
  maxImageWidth,
}) => {
  const { colors, typography } = useTheme();

  // スタイルとルールをメモ化してパフォーマンス向上
  const markdownStyles = useMemo(
    () => getMarkdownStyles({ colors, typography, textColor }),
    [colors, typography, textColor]
  );

  const markdownRules = useMemo(
    () => getMarkdownRules(
      { text: colors.text, textSecondary: colors.textSecondary, border: colors.border },
      maxImageWidth
    ),
    [colors.text, colors.textSecondary, colors.border, maxImageWidth]
  );

  return (
    <Markdown style={markdownStyles} rules={markdownRules} mergeStyle={true}>
      {content}
    </Markdown>
  );
};
