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
  onTap?: (fullPath: string) => void;  // 移動モード時のタップハンドラー
  isMoveMode?: boolean;  // 移動モード中かどうか
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
  onTap,
  isMoveMode = false,
}) => {
  const { colors, spacing, typography } = useTheme();

  // 階層レベルに応じたパディング（ベースオフセット8px + 階層インデント15px）
  const paddingLeft = 15 + (section.level * 15);

  /**
   * 階層レベルに応じた背景色を計算
   * tertiary色に透明度を付けて、レベルが深くなるほど透明度を上げる（薄くなる）
   */
  const getBackgroundColor = (level: number): string => {
    const baseOpacity = 0.8; // レベル0: 80%の不透明度
    const decrement = 0.15; // レベルごとに15%薄くする
    const opacity = Math.max(0.2, baseOpacity - (level * decrement));
    const opacityHex = Math.round(opacity * 255).toString(16).padStart(2, '0');
    return colors.tertiary + opacityHex;
  };

  const headerBackgroundColor = getBackgroundColor(section.level);

  // 移動モード時と通常モード時でハンドラーを切り替え
  const handlePress = () => {
    if (isMoveMode && onTap) {
      onTap(section.fullPath);
    } else {
      onToggle(section.fullPath);
    }
  };

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
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* 展開/折りたたみアイコン */}
      {hasChildren ? (
        <Ionicons
          name={isExpanded ? 'chevron-down' : 'chevron-forward'}
          size={20}
          color={colors.text}
          style={{ marginRight: spacing.xs }}
        />
      ) : null}
      <Text
        style={[
          styles.sectionHeaderText,
          {
            ...typography.title,
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
    fontWeight: 'bold',
  },
});
