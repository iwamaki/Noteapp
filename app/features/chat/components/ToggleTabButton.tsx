/**
 * @file ToggleTabButton.tsx
 * @summary チャット履歴の展開/折りたたみ用の付箋タブ型ボタンコンポーネント
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../design/theme/ThemeContext';

interface ToggleTabButtonProps {
  /** ボタンが押されたときのコールバック */
  onPress: () => void;
  /** 矢印の方向（'up': 展開用, 'down': 折りたたみ用） */
  direction: 'up' | 'down';
  /** ボタンの配置位置（'top': 上端, 'bottom': 下端） */
  position: 'top' | 'bottom';
}

export const ToggleTabButton: React.FC<ToggleTabButtonProps> = ({
  onPress,
  direction,
  position,
}) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    toggleTab: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
      // 位置に応じてtop/bottomと角丸を設定
      ...(position === 'top'
        ? {
            top: -14,
          }
        : {
            bottom: -14,
          }),
    },
    toggleTabInner: {
      width: 60,
      height: 14,
      backgroundColor: colors.background,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
      // 位置に応じて角丸とボーダーを設定
      ...(position === 'top'
        ? {
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            borderTopColor: colors.tertiary,
            borderLeftColor: colors.tertiary,
            borderRightColor: colors.tertiary,
            borderBottomColor: colors.background, // 下端のボーダーを背景色に
          }
        : {
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
            borderBottomColor: colors.tertiary,
            borderLeftColor: colors.tertiary,
            borderRightColor: colors.tertiary,
            borderTopColor: colors.background, // 上端のボーダーを背景色に
          }),
    },
  });

  return (
    <View style={styles.toggleTab}>
      <TouchableOpacity
        onPress={onPress}
        style={styles.toggleTabInner}
        activeOpacity={0.7}
      >
        <Ionicons
          name={direction === 'up' ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colors.tertiary}
        />
      </TouchableOpacity>
    </View>
  );
};
