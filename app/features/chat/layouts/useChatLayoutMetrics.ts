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

/**
 * ChatInputBarの固定高さ
 * iOS: 88px, Android: 92px
 */
export const CHAT_INPUT_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 92;

/**
 * チャットレイアウトのメトリクス情報
 */
export interface ChatLayoutMetrics {
  /** キーボードが表示されているかどうか */
  isKeyboardVisible: boolean;

  /** ChatInputBarの高さ */
  chatInputBarHeight: number;

  /** ChatInputBarのbottom padding（SafeAreaを考慮） */
  chatInputBarBottomPadding: number;

  /** 画面コンテンツのbottom padding（ChatInputBarの高さ + 追加マージン） */
  contentBottomPadding: number;
}

/**
 * チャットレイアウトメトリクスを提供するカスタムフック
 *
 * @param additionalContentPadding - コンテンツに追加する下部パディング（オプション、デフォルト: 16）
 * @returns ChatLayoutMetrics
 *
 * @example
 * ```tsx
 * function NoteListScreen() {
 *   const { contentBottomPadding, isKeyboardVisible } = useChatLayoutMetrics(24);
 *
 *   return (
 *     <FlatList
 *       contentContainerStyle={{ paddingBottom: contentBottomPadding }}
 *     />
 *   );
 * }
 * ```
 */
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

  // ChatInputBarのbottom padding: キーボード表示時は0、非表示時はSafeArea
  const chatInputBarBottomPadding = isKeyboardVisible ? 0 : Math.max(insets.bottom, 8);

  // 画面コンテンツのbottom padding: キーボード表示時は0、非表示時はChatInputBar高さ + 追加マージン
  const contentBottomPadding = isKeyboardVisible ? 0 : CHAT_INPUT_BAR_HEIGHT + additionalContentPadding;

  return {
    isKeyboardVisible,
    chatInputBarHeight: CHAT_INPUT_BAR_HEIGHT,
    chatInputBarBottomPadding,
    contentBottomPadding,
  };
}
