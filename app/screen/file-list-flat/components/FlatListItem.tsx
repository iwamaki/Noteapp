/**
 * @file FlatListItem.tsx
 * @summary フラットリストのアイテムコンポーネント
 * @description
 * ファイルのみを表示する、シンプルなリストアイテム。
 * 既存のTreeListItemからフォルダ関連の要素を削除。
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../design/theme/ThemeContext';
import { FileFlat } from '@data/core/typesFlat';

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
 * 既存のTreeListItemから削除した要素：
 * - インデント（階層なし）
 * - フォルダ展開/折りたたみアイコン
 * - isMoveMode, onSelectDestinationFolder
 */
export const FlatListItem: React.FC<FlatListItemProps> = ({
  file,
  isSelected,
  isSelectionMode,
  onPress,
  onLongPress,
}) => {
  const { colors, spacing } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: isSelected
            ? colors.border
            : colors.secondary,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
        },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {/* 選択チェックボックス（選択モード時） */}
        {isSelectionMode && (
          <Ionicons
            name={isSelected ? 'checkbox' : 'square-outline'}
            size={24}
            color={isSelected ? colors.primary : colors.textSecondary}
            style={{ marginRight: spacing.sm }}
          />
        )}

        {/* ファイルアイコン */}
        <Ionicons
          name="document-text-outline"
          size={24}
          color={colors.text}
          style={{ marginRight: spacing.sm }}
        />

        {/* ファイル情報 */}
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.title,
              {
                color: colors.text,
                fontSize: 16,
              },
            ]}
            numberOfLines={1}
          >
            {file.title}
          </Text>

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
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
    borderRadius: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontWeight: '500',
  },
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
