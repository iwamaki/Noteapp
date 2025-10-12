/**
 * @file FabButton.tsx
 * @summary このファイルは、アプリケーションのフローティングアクションボタン（FAB）コンポーネントを定義します。
 * @responsibility 画面上で主要なアクションをトリガーするための視覚的に目立つボタンを提供し、サイズ、アイコン、色などのカスタマイズを可能にする責任があります。
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { responsive } from '../design/styles/commonStyles';
import { useTheme } from '../design/theme/ThemeContext';

interface FabButtonProps {
  onPress: () => void;
  icon?: string;
  disabled?: boolean;
  backgroundColor?: string;
  size?: 'small' | 'medium' | 'large';
}

export const FabButton: React.FC<FabButtonProps> = ({
  onPress,
  icon = '+',
  disabled = false,
  backgroundColor,
  size = 'medium',
}) => {
  const { colors, spacing, shadows } = useTheme();
  const fabSize = getFabSize(size);
  const defaultBgColor = backgroundColor || colors.primary;

  const styles = StyleSheet.create({
    fab: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
      right: spacing.xxl,
      bottom: spacing.xxl + 60,
      ...shadows.large,
    },
    fabText: {
      color: colors.white,
      fontWeight: 'bold',
    },
    disabled: {
      opacity: 0.5,
    },
  });

  return (
    <TouchableOpacity
      style={[
        styles.fab,
        {
          width: fabSize,
          height: fabSize,
          borderRadius: fabSize / 2,
          backgroundColor: disabled ? colors.textSecondary : defaultBgColor,
        },
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.fabText, { fontSize: getFontSize(size) }]}>
        {icon}
      </Text>
    </TouchableOpacity>
  );
};

const getFabSize = (size: 'small' | 'medium' | 'large'): number => {
  const baseSizes = { small: 40, medium: 56, large: 72 };
  return responsive.getResponsiveSize(
    baseSizes[size] - 8,
    baseSizes[size],
    baseSizes[size] + 8
  );
};

const getFontSize = (size: 'small' | 'medium' | 'large'): number => {
  const fontSizes = { small: 18, medium: 24, large: 30 };
  return responsive.getResponsiveSize(
    fontSizes[size] - 2,
    fontSizes[size],
    fontSizes[size] + 2
  );
};
