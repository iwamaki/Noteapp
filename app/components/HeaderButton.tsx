/**
 * @file HeaderButton.tsx
 * @summary このファイルは、アプリケーションのヘッダーで使用されるボタンコンポーネントを定義します。
 * @responsibility ヘッダー内に配置されるアクションボタンのスタイルと動作を標準化し、視覚的な一貫性と再利用性を提供する責任があります。
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { responsive } from '../design/styles/responsive';
import { useTheme } from '../design/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons'; // Import Ionicons

interface HeaderButtonProps {
  title?: string;
  icon?: React.ReactNode;
  iconName?: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  disabled?: boolean;
  color?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const HeaderButton: React.FC<HeaderButtonProps> = ({
  title,
  icon,
  iconName,
  onPress,
  disabled = false,
  color,
  variant = 'primary',
}) => {
  const { colors, spacing, typography } = useTheme();

  const getButtonColor = () => {
    if (color) return color;

    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.textSecondary;
      case 'danger':
        return colors.danger;
      default:
        return colors.primary;
    }
  };

  const styles = StyleSheet.create({
    button: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      minWidth: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonText: {
      ...typography.header,
      textAlign: 'center',
    },
    disabled: {
      opacity: 0.5,
    },
  });

  const buttonColor = disabled ? colors.textSecondary : getButtonColor();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {icon ? (
        icon
      ) : iconName ? (
        <Ionicons
          name={iconName}
          size={responsive.getResponsiveSize(20, 22, 24)}
          color={buttonColor}
        />
      ) : (
        <Text
          style={[
            styles.buttonText,
            {
              color: buttonColor,
              fontSize: responsive.getResponsiveSize(14, 16, 18),
            },
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};
