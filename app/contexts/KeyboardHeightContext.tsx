/**
 * @file KeyboardHeightContext.tsx
 * @summary このファイルは、アプリケーション全体のキーボード高さとチャット入力バーの高さを管理するContextとProviderを定義します。
 * @responsibility キーボードイベントリスナーを一元管理し、全コンポーネントで一貫したキーボード高さ情報を利用可能にします。
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Keyboard, Platform } from 'react-native';

// キーボード高さコンテキストの型定義
interface KeyboardHeightContextType {
  keyboardHeight: number;
  chatInputBarHeight: number;
  setChatInputBarHeight: (height: number) => void;
}

const KeyboardHeightContext = createContext<KeyboardHeightContextType | null>(null);

export function KeyboardHeightProvider({ children }: { children: React.ReactNode }) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [chatInputBarHeight, setChatInputBarHeight] = useState(74); // デフォルト値

  // キーボードイベントリスナーの設定（platformInfo.tsから移動）
  useEffect(() => {
    const keyboardShowEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const keyboardHideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const keyboardWillShowSub = Keyboard.addListener(keyboardShowEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });

    const keyboardWillHideSub = Keyboard.addListener(keyboardHideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardWillShowSub.remove();
      keyboardWillHideSub.remove();
    };
  }, []);

  const value = useMemo(
    () => ({
      keyboardHeight,
      chatInputBarHeight,
      setChatInputBarHeight,
    }),
    [keyboardHeight, chatInputBarHeight]
  );

  return (
    <KeyboardHeightContext.Provider value={value}>
      {children}
    </KeyboardHeightContext.Provider>
  );
}

/**
 * キーボード高さとチャット入力バー高さを取得するフック
 */
export function useKeyboardHeight() {
  const context = useContext(KeyboardHeightContext);
  if (!context) {
    throw new Error('useKeyboardHeight must be used within KeyboardHeightProvider');
  }
  return context;
}
