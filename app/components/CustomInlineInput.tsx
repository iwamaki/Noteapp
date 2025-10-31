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

  const styles = StyleSheet.create({
    container: {
      position: 'relative',
      // width: '100%' を削除してflexで親に従うように
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius,
      paddingHorizontal: 15,
      paddingVertical: 10,
      paddingRight: hasValue ? 40 : 15, // バッテンボタンのスペースを確保
      fontSize: typography.subtitle.fontSize,
      backgroundColor: colors.background,
      color: colors.text,
    },
    clearButton: {
      position: 'absolute',
      right: 10,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 12,
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
