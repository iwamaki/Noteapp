import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { colors, spacing, shadows, typography, responsive } from '../utils/commonStyles';

interface ListItemProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
  rightElement?: React.ReactNode;
  disabled?: boolean;
}

export const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  onPress,
  rightElement,
  disabled = false,
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: spacing.md,
    padding: responsive.getResponsiveSize(spacing.md, spacing.lg, spacing.xl),
    ...shadows.small,
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
});