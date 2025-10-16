/**
 * @file ListItem.tsx
 * @summary このファイルは、アプリケーションのリストアイテムコンポーネントを定義します。
 * @responsibility ノート一覧などのリスト表示において、各アイテムのタイトル、サブタイトル、選択状態、およびアクションを視覚的に表現する責任があります。
 */
import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, TextStyle } from 'react-native';
import { responsive } from '../design/styles/commonStyles';
import { useTheme } from '../design/theme/ThemeContext';

// ============================================================
// Container Component (Main ListItem)
// ============================================================

interface ListItemContainerProps {
  onPress?: () => void;
  onLongPress?: () => void;
  rightElement?: React.ReactNode;
  disabled?: boolean;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  children?: React.ReactNode;
}

const ListItemContainer: React.FC<ListItemContainerProps> = ({
  onPress,
  onLongPress,
  rightElement,
  disabled = false,
  isSelected = false,
  isSelectionMode = false,
  children,
}) => {
  const { colors, spacing, shadows } = useTheme();

  const styles = StyleSheet.create({
      container: {
      backgroundColor: colors.transparent,
      borderRadius: 0,
      marginBottom: 0,
      padding: responsive.getResponsiveSize(spacing.sm, spacing.md, spacing.lg),
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
      borderColor: colors.primary,
    },
    selectionMode: {
      backgroundColor: colors.background,
    },
    checkboxContainer: {
      marginLeft: spacing.md,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 4,
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
      disabled={disabled || !onPress}
    >
      <View style={styles.content}>
        {children}
      </View>
      {isSelectionMode && (
        <View style={styles.checkboxContainer}>
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Text style={styles.checkboxText}>✓</Text>}
          </View>
        </View>
      )}
      {!isSelectionMode && rightElement && (
        <View style={styles.rightContainer}>
          {rightElement}
        </View>
      )}
    </TouchableOpacity>
  );
};

// ============================================================
// Subcomponents
// ============================================================

interface ListItemTitleProps {
  children: React.ReactNode;
  numberOfLines?: number;
  style?: TextStyle;
}

const ListItemTitle: React.FC<ListItemTitleProps> = ({ children, numberOfLines = 1, style }) => {
  const { colors, spacing, typography } = useTheme();

  const styles = StyleSheet.create({
    title: {
      ...typography.title,
      marginBottom: spacing.xs,
      color: colors.text,
    },
  });

  return (
    <Text style={[styles.title, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
};

interface ListItemSubtitleProps {
  children: React.ReactNode;
  numberOfLines?: number;
  style?: TextStyle;
}

const ListItemSubtitle: React.FC<ListItemSubtitleProps> = ({ children, numberOfLines = 1, style }) => {
  const { colors, typography } = useTheme();

  const styles = StyleSheet.create({
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
    },
  });

  return (
    <Text style={[styles.subtitle, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
};

interface ListItemDescriptionProps {
  children: React.ReactNode;
  numberOfLines?: number;
  style?: TextStyle;
}

const ListItemDescription: React.FC<ListItemDescriptionProps> = ({ children, numberOfLines = 2, style }) => {
  const { colors, spacing, typography } = useTheme();

  const styles = StyleSheet.create({
    description: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: spacing.xs / 2,
    },
  });

  return (
    <Text style={[styles.description, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
};

interface ListItemButtonGroupOption {
  label: string;
  value: string;
}

interface ListItemButtonGroupProps {
  options: ListItemButtonGroupOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const ListItemButtonGroup: React.FC<ListItemButtonGroupProps> = ({
  options,
  value,
  onChange,
  disabled = false,
}) => {
  const { colors, spacing, typography } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      marginTop: spacing.md,
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    button: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: 6,
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      ...typography.body,
      color: colors.text,
    },
    buttonTextActive: {
      color: colors.background,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.container}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.button,
            value === option.value && styles.buttonActive,
            disabled && styles.buttonDisabled,
          ]}
          onPress={() => !disabled && onChange(option.value)}
          disabled={disabled}
        >
          <Text
            style={[
              styles.buttonText,
              value === option.value && styles.buttonTextActive,
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ============================================================
// Exports
// ============================================================

export const ListItem = {
  Container: ListItemContainer,
  Title: ListItemTitle,
  Subtitle: ListItemSubtitle,
  Description: ListItemDescription,
  ButtonGroup: ListItemButtonGroup,
};

// Backward compatibility: default export as Container
export default ListItemContainer;
