/**
 * @file useKeyboardAwareHeight.ts
 * @summary ChatInputBarの高さを追跡し、キーボード表示時のレイアウト調整に使用するカスタムフック
 * @responsibility ChatInputBarの高さ変化を検知し、KeyboardHeightContextに報告
 */

import { useCallback, useEffect, useRef } from 'react';
import { LayoutChangeEvent } from 'react-native';
import { useKeyboardHeight } from '../../../contexts/KeyboardHeightContext';

/**
 * キーボード対応の高さ追跡フックのオプション
 */
interface UseKeyboardAwareHeightOptions {
  /** リサイズ中かどうか */
  isResizing: boolean;
}

/**
 * キーボード対応の高さ追跡フックの戻り値
 */
interface UseKeyboardAwareHeightResult {
  /** レイアウト変更時のハンドラ */
  handleLayout: (event: LayoutChangeEvent) => void;
}

/**
 * ChatInputBarの高さを追跡し、キーボード表示時のレイアウト調整に使用するカスタムフック
 *
 * @param options フックのオプション
 * @returns レイアウトハンドラを含むオブジェクト
 */
export const useKeyboardAwareHeight = (
  options: UseKeyboardAwareHeightOptions
): UseKeyboardAwareHeightResult => {
  const { isResizing } = options;
  const { setChatInputBarHeight } = useKeyboardHeight();
  const lastHeightRef = useRef<number>(0);

  // ChatInputBarの高さを計測してContextに報告
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      const roundedHeight = Math.round(height); // 小数点以下を丸める

      // 高さが実際に変わったときのみ更新（閾値1px以上）
      if (Math.abs(roundedHeight - lastHeightRef.current) > 1) {
        lastHeightRef.current = roundedHeight;
        // スワイプ中はレイアウト更新を抑制
        if (!isResizing) {
          setChatInputBarHeight(roundedHeight);
        }
      }
    },
    [isResizing, setChatInputBarHeight]
  );

  // スワイプ終了時にレイアウトを更新
  useEffect(() => {
    if (!isResizing && lastHeightRef.current > 0) {
      setChatInputBarHeight(lastHeightRef.current);
    }
  }, [isResizing, setChatInputBarHeight]);

  return {
    handleLayout,
  };
};
