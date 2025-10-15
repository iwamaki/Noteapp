/**
 * @file useChatLayoutMetrics.ts
 * @summary チャット入力バーのレイアウトメトリクスを一元管理するカスタムフック
 * @description このフックは、キーボードの表示状態、ChatInputBarの高さ、
 * 画面コンテンツに必要なpadding値を計算し、すべてのレイアウト責任を集約します。
 * @responsibility
 * - キーボードの表示/非表示状態の監視
 * - ChatInputBarの高さ定数の提供
 * - 画面コンテンツに必要なbottom padding値の計算
 * - SafeAreaInsetsを考慮したpadding調整
 */

import { usePlatformInfo } from '../../../utils/platformInfo';

// チャットレイアウトのメトリクスを表すインターフェース
export interface ChatLayoutMetrics {
  isKeyboardVisible: boolean;
  chatInputBarBottomPadding: number;
  contentBottomPadding: number;
}

// チャットレイアウトのメトリクスを計算するカスタムフック
export function useChatLayoutMetrics(
  chatInputBarHeight: number,
  additionalContentPadding: number = 16
): ChatLayoutMetrics {
  const { insets, keyboardHeight } = usePlatformInfo(); // キーボードの高さとSafeAreaInsetsを取得
  const isKeyboardVisible = keyboardHeight > 0;         // キーボードの表示状態を判定
  const chatInputBarBottomPadding = isKeyboardVisible ? keyboardHeight : 0;   // ChatInputBarのbottom paddingを計算
  const contentBottomPadding = isKeyboardVisible    // 画面コンテンツのbottom paddingを計算
    ? chatInputBarHeight + keyboardHeight + additionalContentPadding    // キーボード表示時
    : chatInputBarHeight + Math.max(insets.bottom, 0) + additionalContentPadding;     // キーボード非表示時

  return {
    isKeyboardVisible,  // キーボードの表示状態
    chatInputBarBottomPadding, // ChatInputBarのbottom padding
    contentBottomPadding, // 画面コンテンツのbottom padding
  };
}