/**
 * @file ActionsListModal.tsx
 * @summary アクションリスト付きモーダル共通コンポーネント
 * @description
 * アイテム情報 + アクションリストを持つモーダルを共通化。
 * ファイルやカテゴリーの操作メニューに使用。
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../design/theme/ThemeContext';
import { CustomModal } from './CustomModal';
import { Ionicons } from '@expo/vector-icons';

export interface ActionItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ItemInfo {
  icon: keyof typeof Ionicons.glyphMap;
  name: string;
  metadata?: string;
  iconColor?: string;
}

interface ActionsListModalProps {
  visible: boolean;
  title: string;
  itemInfo?: ItemInfo;
  actions: ActionItem[];
  onClose: () => void;
}

/**
 * アクションリスト付きモーダル
 *
 * アイテム情報を表示し、複数のアクションを選択できるモーダル。
 * ファイルやカテゴリーの操作メニューに使用。
 */
export const ActionsListModal: React.FC<ActionsListModalProps> = ({
  visible,
  title,
  itemInfo,
  actions,
  onClose,
}) => {
  const { colors, typography, spacing } = useTheme();

  const styles = StyleSheet.create({
    itemInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.background,
      borderRadius: 8,
      marginBottom: spacing.md,
    },
    itemIcon: {
      marginRight: spacing.sm,
    },
    itemTextContainer: {
      flex: 1,
    },
    itemName: {
      ...typography.body,
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    itemMetadata: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
      fontSize: 12,
    },
    actionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
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
      title={title}
      onClose={onClose}
      buttons={[
        {
          text: 'キャンセル',
          style: 'cancel',
          onPress: onClose,
        },
      ]}
    >
      {/* アイテム情報 */}
      {itemInfo && (
        <View style={styles.itemInfo}>
          <Ionicons
            name={itemInfo.icon}
            size={24}
            color={itemInfo.iconColor || colors.primary}
            style={styles.itemIcon}
          />
          <View style={styles.itemTextContainer}>
            <Text style={styles.itemName} numberOfLines={1}>
              {itemInfo.name}
            </Text>
            {itemInfo.metadata && (
              <Text style={styles.itemMetadata} numberOfLines={1}>
                {itemInfo.metadata}
              </Text>
            )}
          </View>
        </View>
      )}

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
