
/**
 * @file KeyboardContext.tsx
 * @summary キーボードの高さをグローバルに提供するためのReact Context Provider
 * @description このコンポーネントは、キーボードの表示・非表示イベントを監視し、
 * キーボードの高さをアプリケーション全体で利用可能なコンテキストとして提供します。
 * これにより、各画面はキーボードの表示状態に応じてレイアウトを動的に調整できます。
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Keyboard, Platform, EmitterSubscription } from 'react-native';

interface KeyboardContextData {
  keyboardHeight: number;
}

const KeyboardContext = createContext<KeyboardContextData>({
  keyboardHeight: 0,
});

export const useKeyboard = () => useContext(KeyboardContext);

export const KeyboardProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const keyboardWillShow = (e: any) => {
      const { height } = e.endCoordinates;

      console.log('[KeyboardContext] Keyboard show:', {
        platform: Platform.OS,
        keyboardHeight: height,
      });

      setKeyboardHeight(height);
    };

    const keyboardWillHide = () => {
      console.log('[KeyboardContext] Keyboard hide');
      setKeyboardHeight(0);
    };

    const showSubscription: EmitterSubscription = Keyboard.addListener(showEvent, keyboardWillShow);
    const hideSubscription: EmitterSubscription = Keyboard.addListener(hideEvent, keyboardWillHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return (
    <KeyboardContext.Provider value={{ keyboardHeight }}>
      {children}
    </KeyboardContext.Provider>
  );
};
