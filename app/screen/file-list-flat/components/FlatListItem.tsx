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
  isSelected,
  isSelectionMode,
  onPress,
  onLongPress,
}) => {
  const { colors, spacing } = useTheme();

  // 左側要素：ファイルアイコン
  const leftElement = (
    <Ionicons
      name="document-text-outline"
      size={24}
      color={colors.text}
    />
  );

  return (
    <ListItem.Container
      onPress={onPress}
      onLongPress={onLongPress}
      isSelected={isSelected}
      isSelectionMode={isSelectionMode}
      leftElement={leftElement}
    >
      <ListItem.Title>{file.title}</ListItem.Title>

      {/* カテゴリー・タグ表示 */}
      {(file.categories.length > 0 || file.tags.length > 0) && (
        <View style={styles.metadataContainer}>
          {/* カテゴリー */}
          {file.categories.map((category, index) => (
            <View
              key={`cat-${index}`}
              style={[
                styles.badge,
                {
                  backgroundColor: colors.border,
                  marginRight: spacing.xs,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: colors.primary, fontSize: 12 },
                ]}
              >
                {category}
              </Text>
            </View>
          ))}

          {/* タグ */}
          {file.tags.map((tag, index) => (
            <View
              key={`tag-${index}`}
              style={[
                styles.badge,
                {
                  backgroundColor: colors.border,
                  marginRight: spacing.xs,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: colors.textSecondary, fontSize: 12 },
                ]}
              >
                #{tag}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ListItem.Container>
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
});
