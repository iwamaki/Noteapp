/**
 * @file FileActionsModal.tsx
 * @summary ファイルアクション選択モーダル
 * @description
 * 長押しされたファイルに対する操作を選択するモーダル。
 * 削除、コピー、名前変更などのアクションを提供。
 * CustomModalを活用してUI統一し、画面中央に表示。
 * 将来的にカテゴリー編集やタグ編集も追加可能。
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
import { FileFlat } from '@data/core/typesFlat';

interface FileActionsModalProps {
  visible: boolean;
  file: FileFlat | null;
  onClose: () => void;
  onDelete: (file: FileFlat) => void;
  onCopy: (file: FileFlat) => void;
  onRename: (file: FileFlat) => void;
  onEditCategories: (file: FileFlat) => void;
  onEditTags: (file: FileFlat) => void;
}

interface ActionItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

export const FileActionsModal: React.FC<FileActionsModalProps> = ({
  visible,
  file,
  onClose,
  onDelete,
  onCopy,
  onRename,
  onEditCategories,
  onEditTags,
}) => {
  const { colors, typography, spacing } = useTheme();

  if (!file) return null;

  const actions: ActionItem[] = [
    {
      icon: 'create-outline',
      label: '名前を変更',
      onPress: () => {
        onRename(file);
        onClose();
      },
    },
    {
      icon: 'folder-outline',
      label: 'カテゴリーを編集',
      onPress: () => {
        onEditCategories(file);
        onClose();
      },
    },
    {
      icon: 'pricetag-outline',
      label: 'タグを編集',
      onPress: () => {
        onEditTags(file);
        onClose();
      },
    },
    {
      icon: 'copy-outline',
      label: 'コピーを作成',
      onPress: () => {
        onCopy(file);
        onClose();
      },
    },
    {
      icon: 'trash-outline',
      label: '削除',
      onPress: () => {
        onDelete(file);
        onClose();
      },
      destructive: true,
    },
  ];

  const styles = StyleSheet.create({
    fileInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      backgroundColor: colors.background,
      borderRadius: 8,
      marginBottom: spacing.md,
    },
    fileIcon: {
      marginRight: spacing.sm,
    },
    fileTextContainer: {
      flex: 1,
    },
    fileName: {
      ...typography.body,
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    fileMetadata: {
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
    },
  });

  // メタデータ表示用のテキスト
  const getMetadataText = () => {
    const parts = [];
    if (file.category) {
      parts.push(file.category);
    }
    if (file.tags.length > 0) {
      parts.push(file.tags.map(tag => `#${tag}`).join(' '));
    }
    return parts.length > 0 ? parts.join(' • ') : 'メタデータなし';
  };

  return (
    <CustomModal
      isVisible={visible}
      title="ファイル操作"
      onClose={onClose}
      buttons={[
        {
          text: 'キャンセル',
          style: 'cancel',
          onPress: onClose,
        },
      ]}
    >
      {/* ファイル情報 */}
      <View style={styles.fileInfo}>
        <Ionicons
          name="document-text"
          size={24}
          color={colors.primary}
          style={styles.fileIcon}
        />
        <View style={styles.fileTextContainer}>
          <Text style={styles.fileName} numberOfLines={1}>
            {file.title}
          </Text>
          <Text style={styles.fileMetadata} numberOfLines={1}>
            {getMetadataText()}
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
