import React from 'react';
import { TextInput, StyleSheet, TextInputProps, View, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '../../app/design/theme/ThemeContext';

interface CustomInlineInputProps extends TextInputProps {
  borderRadius?: number;
  onClear?: () => void;
}

export const CustomInlineInput: React.FC<CustomInlineInputProps> = ({
  borderRadius = 15, // Default to 15 as per user's last request
  style,
  value,
  onClear,
  ...rest
}) => {
  const { colors, typography, spacing } = useTheme();

  // テキストが入力されているかチェック
  const hasValue = value && value.toString().length > 0;

  // バッテンボタンのサイズを計算（当たり判定を大きめに）
  const clearButtonSize = spacing.xl + spacing.md; // 20 + 10 = 30
  const clearButtonPadding = spacing.md; // 10

  const styles = StyleSheet.create({
    container: {
      position: 'relative',
      // width: '100%' を削除してflexで親に従うように
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      paddingRight: hasValue ? clearButtonSize + clearButtonPadding : spacing.lg, // バッテンボタンのスペースを確保
      fontSize: typography.subtitle.fontSize,
      backgroundColor: colors.background,
      color: colors.text,
    },
    clearButton: {
      position: 'absolute',
      right: spacing.xs,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      minWidth: clearButtonSize,
    },
    clearButtonText: {
      color: colors.textSecondary,
      fontSize: 18,
      fontWeight: '400',
      lineHeight: 18,
    },
  });

  const handleClear = () => {
    if (onClear) {
      onClear();
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TextInput
        style={styles.textInput}
        placeholderTextColor={colors.textSecondary}
        value={value}
        {...rest}
      />
      {hasValue && onClear && (
        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
          <Text style={styles.clearButtonText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
