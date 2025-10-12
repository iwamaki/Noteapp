/**
 * @file NoteListBreadcrumb.tsx
 * @summary パンくずリストコンポーネント - 現在のフォルダパスを表示し、階層間のナビゲーションを提供
 * @responsibility フォルダ階層を視覚的に表示し、各階層へのナビゲーションを可能にする
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../design/theme/ThemeContext';

interface Breadcrumb {
  name: string;
  path: string;
}

interface NoteListBreadcrumbProps {
  breadcrumbs: Breadcrumb[];
  onNavigate: (path: string) => void;
}

export const NoteListBreadcrumb: React.FC<NoteListBreadcrumbProps> = ({
  breadcrumbs,
  onNavigate,
}) => {
  const { colors, spacing, typography } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.secondary,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexWrap: 'wrap',
    },
    breadcrumbItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    breadcrumbButton: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: 4,
    },
    breadcrumbText: {
      ...typography.body,
      color: colors.primary,
      fontWeight: '500',
    },
    lastBreadcrumbText: {
      color: colors.text,
      fontWeight: '600',
    },
    separator: {
      ...typography.body,
      color: colors.textSecondary,
      marginHorizontal: spacing.xs,
    },
  });

  return (
    <View style={styles.container}>
      {breadcrumbs.map((breadcrumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        return (
          <View key={breadcrumb.path} style={styles.breadcrumbItem}>
            <TouchableOpacity
              style={styles.breadcrumbButton}
              onPress={() => !isLast && onNavigate(breadcrumb.path)}
              disabled={isLast}
            >
              <Text
                style={[
                  styles.breadcrumbText,
                  isLast && styles.lastBreadcrumbText,
                ]}
              >
                {breadcrumb.name}
              </Text>
            </TouchableOpacity>
            {!isLast && <Text style={styles.separator}>/</Text>}
          </View>
        );
      })}
    </View>
  );
};
