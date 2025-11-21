/**
 * @file FlatListItem.tsx
 * @summary フラットリストのアイテムコンポーネント
 * @description
 * ファイルのみを表示する、シンプルなリストアイテム。
 * 共通のListItemコンポーネントを使用して見た目を統一。
 */

import React, { useMemo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../design/theme/ThemeContext';
import { FileFlat } from '@data/core/typesFlat';
import { ListItem } from '../../../components/ListItem';
import { FILE_LIST_FLAT_CONFIG } from '../config';

interface FlatListItemProps {
  file: FileFlat;
  level: number;
  isSelected: boolean;
  isSelectionMode: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

/**
 * フラットリストアイテム
 *
 * 共通のListItemコンポーネントを使用：
 * - leftElement: ファイルアイコン
 * - children: タイトル + カテゴリー・タグバッジ
 * - 選択状態は背景色で表現（チェックボックスなし）
 */
const FlatListItemComponent: React.FC<FlatListItemProps> = ({
  file,
  level,
  isSelected,
  isSelectionMode,
  onPress,
  onLongPress,
}) => {
  const { colors, spacing, iconSizes, typography } = useTheme();

  // 階層インデント計算（親カテゴリーの子要素として、同じ階層の子カテゴリーと同じ位置）
  const itemPaddingLeft = (level + 1) * FILE_LIST_FLAT_CONFIG.spacing.indentPerLevel;

  // アイコンサイズをlargeに設定
  const iconSize = iconSizes.large;

  // メモ化されたスタイル
  const containerStyle = useMemo(() => ({ paddingLeft: itemPaddingLeft }), [itemPaddingLeft]);
  const contentContainerStyle = useMemo(() => ({ marginTop: spacing.xs, paddingLeft: spacing.md }), [spacing.xs, spacing.md]);
  const badgeStyle = useMemo(() => ({
    backgroundColor: colors.primary + FILE_LIST_FLAT_CONFIG.appearance.transparency.badgeAlpha,
    marginRight: spacing.xs,
  }), [colors.primary, spacing.xs]);
  const contentTextStyle = useMemo(() => [typography.caption, { color: colors.textSecondary }], [typography.caption, colors.textSecondary]);

  // 左側要素：ファイルアイコン
  const leftElement = useMemo(() => (
    <Ionicons
      name="document-text-outline"
      size={iconSize}
      color={colors.text}
    />
  ), [iconSize, colors.text]);

  return (
    <View style={containerStyle}>
      <ListItem.Container
        onPress={onPress}
        onLongPress={onLongPress}
        isSelected={isSelected}
        isSelectionMode={isSelectionMode}
        leftElement={leftElement}
      >
      <ListItem.Title>{file.title}</ListItem.Title>

      {/* 本文コンテナ */}
      {file.content && (
        <View style={contentContainerStyle}>
          <Text
            style={contentTextStyle}
            numberOfLines={FILE_LIST_FLAT_CONFIG.constraints.contentPreviewMaxLines}
          >
            {file.content}
          </Text>
        </View>
      )}

      {/* タグ表示 */}
      {file.tags.length > 0 && (
        <View style={styles.metadataContainer}>
          {file.tags.map((tag, index) => (
            <View
              key={`tag-${index}`}
              style={[styles.badge, badgeStyle]}
            >
              <Text
                style={[
                  styles.badgeText,
                  styles.tagBadgeText,
                ]}
              >
                #{tag}
              </Text>
            </View>
          ))}
        </View>
      )}
      </ListItem.Container>
    </View>
  );
};

FlatListItemComponent.displayName = 'FlatListItem';

export const FlatListItem = React.memo(FlatListItemComponent);

const styles = StyleSheet.create({
  metadataContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: FILE_LIST_FLAT_CONFIG.spacing.metadataContainer.marginTop,
  },
  badge: {
    paddingHorizontal: FILE_LIST_FLAT_CONFIG.spacing.badge.paddingHorizontal,
    paddingVertical: FILE_LIST_FLAT_CONFIG.spacing.badge.paddingVertical,
    borderRadius: FILE_LIST_FLAT_CONFIG.borderRadius.badge,
    marginTop: FILE_LIST_FLAT_CONFIG.spacing.badge.marginTop,
  },
  badgeText: {
    fontWeight: '500',
  },
  /* eslint-disable react-native/no-color-literals */
  tagBadgeText: {
    fontSize: FILE_LIST_FLAT_CONFIG.typography.caption,
    color: '#FFFFFF',
  },
  /* eslint-enable react-native/no-color-literals */
});
