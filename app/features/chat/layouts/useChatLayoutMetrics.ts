/**
 * @file useChatLayoutMetrics.ts
 * @summary チャット入力バーのレイアウトメトリクスを一元管理するカスタムフック
 * @description このフックは、キーボードの表示状態、ChatInputBarの高さ、
 * 画面コンテンツに必要なpadding値を計算し、すべてのレイアウト責任を集約します。
 * @responsibility
 * - キーボードの表示/非表示状態の監視
 * - ChatInputBarの高さ定数の提供
 * - SafeAreaInsetsを考慮したpadding調整
 */

import { usePlatformInfo } from '../../../utils/platformInfo';
import { useEffect, useRef } from 'react';
import { logger } from '../../../utils/logger';

// ボトムナビの高さを取得


// チャットレイアウトのメトリクスを表すインターフェース
export interface ChatLayoutMetrics {
  isKeyboardVisible: boolean;
  bottomHeight: number;
}

// チャットレイアウトのメトリクスを計算するカスタムフック
export function useChatLayoutMetrics(): ChatLayoutMetrics {
  const { keyboardHeight, bottomNavBarHeight } = usePlatformInfo();   // キーボードの高さを取得
  const isKeyboardVisible = keyboardHeight > 0;                       // キーボードの表示状態を判定
  const bottomHeight = (isKeyboardVisible ? keyboardHeight : 0) + bottomNavBarHeight;         // ChatInputBarのbottomの高さを計算

  const prevBottomHeightRef = useRef(bottomHeight);
  useEffect(() => {
    if (prevBottomHeightRef.current !== bottomHeight) {
      logger.debug('chat', 'bottomHeight changed to:', bottomHeight);
      prevBottomHeightRef.current = bottomHeight;
    }
  }, [bottomHeight]);

  return {
    isKeyboardVisible,  // キーボードの表示状態
    bottomHeight, // ChatInputBarのbottomの高さ
  };
}