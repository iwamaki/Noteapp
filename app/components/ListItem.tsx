/**
 * @file ListItem.tsx
 * @summary このファイルは、アプリケーションのリストアイテムコンポーネントを定義します。
 * @responsibility ノート一覧などのリスト表示において、各アイテムのタイトル、サブタイトル、選択状態、およびアクションを視覚的に表現する責任があります。
 */
import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { responsive } from '../utils/commonStyles';
import { useTheme } from '../theme/ThemeContext';

interface ListItemProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
  onLongPress?: () => void;
  rightElement?: React.ReactNode;
  disabled?: boolean;
  isSelected?: boolean;
  isSelectionMode?: boolean;
}

export const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  onPress,
  onLongPress,
  rightElement,
  disabled = false,
  isSelected = false,
  isSelectionMode = false,
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
    title: {
      ...typography.title,
      marginBottom: spacing.xs,
      color: colors.text,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
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
      backgroundColor: 'transparent',
    },
    checkboxSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checkboxText: {
      color: 'white',
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
        <Text style={styles.title} numberOfLines={1}>
          {title || '無題のノート'}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement && (
        <View style={styles.rightContainer}>
          {rightElement}
        </View>
      )}
    </TouchableOpacity>
  );
};
