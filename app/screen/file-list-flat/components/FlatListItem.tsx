/**
 * @file FlatListItem.tsx
 * @summary フラットリストのアイテムコンポーネント
 * @description
 * ファイルのみを表示する、シンプルなリストアイテム。
 * 共通のListItemコンポーネントを使用して見た目を統一。
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../design/theme/ThemeContext';
import { FileFlat } from '@data/core/typesFlat';
import { ListItem } from '../../../components/ListItem';

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
export const FlatListItem: React.FC<FlatListItemProps> = ({
  file,
  level,
  isSelected,
  isSelectionMode,
  onPress,
  onLongPress,
}) => {
  const { colors, spacing, iconSizes } = useTheme();

  // 階層インデント計算（親カテゴリーの子要素として、同じ階層の子カテゴリーと同じ位置）
  const itemPaddingLeft = (level + 1) * 24;

  // アイコンサイズをlargeに設定
  const iconSize = iconSizes.large;

  // 左側要素：ファイルアイコン
  const leftElement = (
    <Ionicons
      name="document-text-outline"
      size={iconSize}
      color={colors.text}
    />
  );

  return (
    <View style={{ paddingLeft: itemPaddingLeft }}>
      <ListItem.Container
        onPress={onPress}
        onLongPress={onLongPress}
        isSelected={isSelected}
        isSelectionMode={isSelectionMode}
        leftElement={leftElement}
      >
      <ListItem.Title>{file.title}</ListItem.Title>

      {/* タグ表示 */}
      {file.tags.length > 0 && (
        <View style={styles.metadataContainer}>
          {file.tags.map((tag, index) => (
            <View
              key={`tag-${index}`}
              style={[
                styles.badge,
                {
                  backgroundColor: colors.primary + '70', // 70%の透明度
                  marginRight: spacing.xs,
                },
              ]}
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

const styles = StyleSheet.create({
  metadataContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  badgeText: {
    fontWeight: '500',
  },
  /* eslint-disable react-native/no-color-literals */
  tagBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  /* eslint-enable react-native/no-color-literals */
});
