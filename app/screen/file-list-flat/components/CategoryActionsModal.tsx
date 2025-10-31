/**
 * @file CategoryActionsModal.tsx
 * @summary カテゴリーアクション選択モーダル
 * @description
 * 長押しされたカテゴリーに対する操作を選択するモーダル。
 * 削除、名前変更のアクションを提供。
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../../design/theme/ThemeContext';
import { CustomModal } from '../../../components/CustomModal';
import { Ionicons } from '@expo/vector-icons';

interface CategoryActionsModalProps {
  visible: boolean;
  categoryPath: string | null;
  categoryName: string | null;
  fileCount: number;
  onClose: () => void;
  onDelete: (categoryPath: string) => void;
  onRename: (categoryPath: string) => void;
}

interface ActionItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

export const CategoryActionsModal: React.FC<CategoryActionsModalProps> = ({
  visible,
  categoryPath,
  categoryName,
  fileCount,
  onClose,
  onDelete,
  onRename,
}) => {
  const { colors, typography, spacing } = useTheme();

  if (!categoryPath || !categoryName) return null;

  const actions: ActionItem[] = [
    {
      icon: 'create-outline',
      label: '名前を変更',
      onPress: () => {
        onRename(categoryPath);
        onClose();
      },
    },
    {
      icon: 'trash-outline',
      label: '削除',
      onPress: () => {
        onDelete(categoryPath);
        onClose();
      },
      destructive: true,
    },
  ];

  const styles = StyleSheet.create({
    categoryInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      backgroundColor: colors.background,
      borderRadius: 8,
      marginBottom: spacing.md,
    },
    categoryIcon: {
      marginRight: spacing.sm,
    },
    categoryTextContainer: {
      flex: 1,
    },
    categoryName: {
      ...typography.body,
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    categoryMetadata: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
      fontSize: 12,
    },
    actionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: 8,
      marginVertical: 2,
    },
    actionIcon: {
      width: 32,
      alignItems: 'center',
      marginRight: spacing.md,
    },
    actionLabel: {
      ...typography.body,
      fontSize: 16,
      flex: 1,
      color: colors.text,
    },
  });

  return (
    <CustomModal
      isVisible={visible}
      title="カテゴリー操作"
      onClose={onClose}
      buttons={[
        {
          text: 'キャンセル',
          style: 'cancel',
          onPress: onClose,
        },
      ]}
    >
      {/* カテゴリー情報 */}
      <View style={styles.categoryInfo}>
        <Ionicons
          name="folder"
          size={24}
          color={colors.primary}
          style={styles.categoryIcon}
        />
        <View style={styles.categoryTextContainer}>
          <Text style={styles.categoryName} numberOfLines={1}>
            {categoryName}
          </Text>
          <Text style={styles.categoryMetadata} numberOfLines={1}>
            {fileCount}個のファイル
          </Text>
        </View>
      </View>

      {/* アクション一覧 */}
      {actions.map((action, index) => (
        <TouchableOpacity
          key={index}
          style={styles.actionItem}
          onPress={action.onPress}
          activeOpacity={0.7}
        >
          <View style={styles.actionIcon}>
            <Ionicons
              name={action.icon}
              size={24}
              color={action.destructive ? colors.danger : colors.text}
            />
          </View>
          <Text
            style={[
              styles.actionLabel,
              action.destructive && { color: colors.danger },
            ]}
          >
            {action.label}
          </Text>
        </TouchableOpacity>
      ))}
    </CustomModal>
  );
};
