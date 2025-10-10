/**
 * @file ListItem.tsx
 * @summary このファイルは、アプリケーションのリストアイテムコンポーネントを定義します。
 * @responsibility ノート一覧などのリスト表示において、各アイテムのタイトル、サブタイトル、選択状態、およびアクションを視覚的に表現する責任があります。
 */
import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { responsive } from '../design/styles/commonStyles';
import { useTheme } from '../design/theme/ThemeContext';

interface ListItemProps {
  onPress: () => void;
  onLongPress?: () => void;
  rightElement?: React.ReactNode;
  disabled?: boolean;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  children?: React.ReactNode;
}

export const ListItem: React.FC<ListItemProps> = ({
  onPress,
  onLongPress,
  rightElement,
  disabled = false,
  isSelected = false,
  isSelectionMode = false,
  children,
}) => {
  const { colors, spacing, shadows, typography } = useTheme();

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      borderRadius: 8,
      marginBottom: spacing.md,
      padding: responsive.getResponsiveSize(spacing.md, spacing.lg, spacing.xl),
      ...shadows.small,
      flexDirection: 'row',
      alignItems: 'center',
    },
    content: {
      flex: 1,
    },
    rightContainer: {
      marginLeft: spacing.md,
      justifyContent: 'center',
    },
    disabled: {
      opacity: 0.5,
    },
    selected: {
      backgroundColor: colors.primary + '20',
      borderWidth: 2,
      borderColor: colors.primary,
    },
    selectionMode: {
      backgroundColor: colors.background,
    },
    checkboxContainer: {
      marginRight: spacing.md,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.textSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.transparent,
    },
    checkboxSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checkboxText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: 'bold',
    },
  });

  return (
    <TouchableOpacity
      style={[
        styles.container,
        disabled && styles.disabled,
        isSelected && styles.selected,
        isSelectionMode && styles.selectionMode
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
    >
      {isSelectionMode && (
        <View style={styles.checkboxContainer}>
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Text style={styles.checkboxText}>✓</Text>}
          </View>
        </View>
      )}
      <View style={styles.content}>
        {children}
      </View>
      {rightElement && (
        <View style={styles.rightContainer}>
          {rightElement}
        </View>
      )}
    </TouchableOpacity>
  );
};
