/**
 * @file CategorySectionHeader.tsx
 * @summary カテゴリーセクションヘッダーコンポーネント
 * @description
 * 階層的なカテゴリー表示のためのセクションヘッダー。
 * - 階層レベルに応じたインデント
 * - 階層レベルに応じた背景色の段階的変化
 * - 展開/折りたたみアイコン表示（子要素がある場合のみ）
 * - タップでカテゴリーの展開/折りたたみ切り替え
 */

import React from 'react';
import { StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../design/theme/ThemeContext';
import { FileCategorySectionHierarchical } from '@data/core/typesFlat';

interface CategorySectionHeaderProps {
  section: FileCategorySectionHierarchical;
  isExpanded: boolean;
  hasChildren: boolean;
  onToggle: (fullPath: string) => void;
}

/**
 * カテゴリーセクションヘッダー
 *
 * @param section - カテゴリーセクション情報
 * @param isExpanded - 展開状態
 * @param hasChildren - 子カテゴリーの有無
 * @param onToggle - トグル時のコールバック
 *
 * @example
 * <CategorySectionHeader
 *   section={section}
 *   isExpanded={expandedCategories.has(section.fullPath)}
 *   hasChildren={sections.some(s => s.parent === section.fullPath)}
 *   onToggle={handleToggleCategory}
 * />
 */
export const CategorySectionHeader: React.FC<CategorySectionHeaderProps> = ({
  section,
  isExpanded,
  hasChildren,
  onToggle,
}) => {
  const { colors, spacing } = useTheme();

  // 階層レベルに応じたパディング（24pxずつ増加）
  const paddingLeft = 16 + (section.level * 24);

  /**
   * 階層レベルに応じた背景色を計算
   * レベルが深くなるほど明るくなる（段階的に薄くなる）
   */
  const getBackgroundColor = (level: number): string => {
    const baseValue = 0xD0; // 208 (濃いグレー)
    const increment = 0x0A; // 10 (段階的に明るくする増分)
    const colorValue = Math.min(0xF0, baseValue + (level * increment));
    const hex = colorValue.toString(16).toUpperCase();
    return `#${hex}${hex}${hex}`;
  };

  const headerBackgroundColor = getBackgroundColor(section.level);

  return (
    <TouchableOpacity
      style={[
        styles.sectionHeader,
        {
          backgroundColor: headerBackgroundColor,
          borderBottomColor: colors.border,
          paddingLeft,
        },
      ]}
      onPress={() => onToggle(section.fullPath)}
      activeOpacity={0.7}
    >
      {/* 展開/折りたたみアイコン（子要素がある場合のみ表示） */}
      {hasChildren && (
        <Ionicons
          name={isExpanded ? 'chevron-down' : 'chevron-forward'}
          size={20}
          color={colors.text}
          style={{ marginRight: spacing.xs }}
        />
      )}
      <Text
        style={[
          styles.sectionHeaderText,
          {
            color: colors.text,
          },
        ]}
      >
        {section.category} ({section.fileCount})
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
