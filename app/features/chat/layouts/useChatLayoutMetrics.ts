/**
 * @file useChatLayoutMetrics.ts
 * @summary チャット入力バーのレイアウトメトリクスを一元管理するカスタムフック
 * @description このフックは、キーボードの表示状態、ChatInputBarの高さ、
 * 画面コンテンツに必要なpadding値を計算し、すべてのレイアウト責任を集約します。
 *
 * @responsibility
 * - キーボードの表示/非表示状態の監視
 * - ChatInputBarの高さ定数の提供
 * - 画面コンテンツに必要なbottom padding値の計算
 * - SafeAreaInsetsを考慮したpadding調整
 */

import { useState, useEffect } from 'react';
import { Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// コンポーネントのレイアウト計算に使用される定数（=チャット入力バーのパディング含めた高さ）
export const CHAT_INPUT_BAR_HEIGHT = Platform.OS === 'ios' ? 60 : 60;

/**
 * チャットレイアウトのメトリクス情報
 */
export interface ChatLayoutMetrics {
  isKeyboardVisible: boolean;
  chatInputBarHeight: number;
  chatInputBarBottomPadding: number;
  contentBottomPadding: number;
}


export function useChatLayoutMetrics(additionalContentPadding: number = 16): ChatLayoutMetrics {
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const handleKeyboardShow = () => {
      setKeyboardVisible(true);
    };

    const handleKeyboardHide = () => {
      setKeyboardVisible(false);
    };

    const showSubscription = Keyboard.addListener(showEvent, handleKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const chatInputBarBottomPadding = isKeyboardVisible ? 8 : Math.max(insets.bottom, 8);
  const contentBottomPadding = isKeyboardVisible
    ? CHAT_INPUT_BAR_HEIGHT + additionalContentPadding 
    : CHAT_INPUT_BAR_HEIGHT + additionalContentPadding;

  return {
    isKeyboardVisible,
    chatInputBarHeight: CHAT_INPUT_BAR_HEIGHT,
    chatInputBarBottomPadding,
    contentBottomPadding,
  };
}
