import React from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';
import { useTheme } from '../../app/design/theme/ThemeContext';

interface CustomInlineInputProps extends TextInputProps {
  borderRadius?: number;
}

export const CustomInlineInput: React.FC<CustomInlineInputProps> = ({
  borderRadius = 15, // Default to 15 as per user's last request
  style,
  ...rest
}) => {
  const { colors, typography } = useTheme();

  const styles = StyleSheet.create({
    textInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius,
      paddingHorizontal: 15,
      paddingVertical: 10,
      fontSize: typography.subtitle.fontSize,
      backgroundColor: colors.background,
      color: colors.text,
    },
  });

  return <TextInput style={[styles.textInput, style]} placeholderTextColor={colors.textSecondary} {...rest} />;
};
