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

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { logger } from '../../../utils/logger';
import { usePlatformInfo } from '../../../utils/platformInfo';

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
  const { insets, keyboardHeight } = usePlatformInfo();

  const appState = useRef(AppState.currentState); // To track app state
  const previousInsets = useRef(insets); // 追加

  useEffect(() => {
    // Handle app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      logger.debug('chat', '[ChatLayout] AppState change:', nextAppState, 'insets.bottom:', insets.bottom, 'previous:',
      previousInsets.current.bottom);
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        // Keep previous insets values until new values are properly updated
        // This prevents the chat bar from dropping when returning to foreground
        // Keyboard visibility is now handled by usePlatformInfo
      } else if (nextAppState.match(/inactive|background/)) {
        // App is going to background or inactive
        // Store current insets before going to background
        previousInsets.current = insets;
      }
      appState.current = nextAppState;
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Update previous insets when insets change
    if (insets.bottom > 0) {
      previousInsets.current = insets;
    }

    return () => {
      appStateSubscription.remove(); // Clean up AppState listener
    };
  }, [insets]);

  // Use previous insets if current insets.bottom is suspiciously small (likely during foreground transition)
  const safeInsets = insets.bottom > 0 ? insets : previousInsets.current;
  const chatInputBarBottomPadding = keyboardHeight > 0 ? 8 : Math.max(safeInsets.bottom, 8);
  logger.debug('chat', '[ChatLayout] Using insets.bottom:', safeInsets.bottom, 'padding:', chatInputBarBottomPadding, 'keyboardHeight:', keyboardHeight);
  const contentBottomPadding = keyboardHeight > 0
    ? CHAT_INPUT_BAR_HEIGHT + additionalContentPadding + keyboardHeight
    : CHAT_INPUT_BAR_HEIGHT + additionalContentPadding;

  return {
    isKeyboardVisible: keyboardHeight > 0,
    chatInputBarHeight: CHAT_INPUT_BAR_HEIGHT,
    chatInputBarBottomPadding,
    contentBottomPadding,
  };
}