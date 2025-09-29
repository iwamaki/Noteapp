import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, responsive } from '../utils/commonStyles';

interface HeaderButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const HeaderButton: React.FC<HeaderButtonProps> = ({
  title,
  onPress,
  disabled = false,
  color,
  variant = 'primary',
}) => {
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

  return (
    <TouchableOpacity
      style={[
        styles.button,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text
        style={[
          styles.buttonText,
          {
            color: disabled ? colors.textSecondary : getButtonColor(),
            fontSize: responsive.getResponsiveSize(14, 16, 18),
          },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
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