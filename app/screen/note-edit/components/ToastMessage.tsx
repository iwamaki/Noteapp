/**
 * @file ToastMessage.tsx
 * @summary 一時的なメッセージを表示し、時間経過で自動的に非表示になるコンポーネント
 * @description ユーザーへのフィードバック（保存完了、エラーなど）を画面上部に表示します。
 */

import React, { useEffect, useRef, useState } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../../design/theme/ThemeContext';

interface ToastMessageProps {
  message: string;
  isVisible: boolean;
  duration?: number; // メッセージが表示される時間（ミリ秒）。デフォルトは3000ms
  onHide?: () => void; // メッセージが非表示になったときに呼び出されるコールバック
}

export function ToastMessage({
  message,
  isVisible,
  duration = 3000,
  onHide,
}: ToastMessageProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (isVisible) {
      // 出現アニメーション
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1, // フェードイン
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0, // 画面下部に移動
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // 終了アニメーション
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0, // フェードアウト
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 20, // 画面下部から20px下に移動
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // 終了アニメーションが完了した後にのみonHideを呼び出す
        onHide?.();
      });
    }
  }, [isVisible, opacity, translateY, onHide]);

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        staticStyles.container,
        { backgroundColor: colors.primary, opacity, transform: [{ translateY }] },
      ]}
    >
      <Text style={[staticStyles.message, { color: colors.white }]}>
        {message}
      </Text>
    </Animated.View>
  );
}

export { ToastMessageProps }; // ToastMessagePropsをエクスポート

const staticStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 120, // 画面下部から120px上に配置
    alignSelf: 'center', // 中央寄せ
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25, // 角丸長方形
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999, // 最前面に表示
  },
  message: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
