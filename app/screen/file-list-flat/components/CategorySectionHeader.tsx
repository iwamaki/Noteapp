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
import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../design/theme/ThemeContext';
import { FileCategorySectionHierarchical } from '@data/core/typesFlat';
import { FILE_LIST_FLAT_CONFIG } from '../config';

interface CategorySectionHeaderProps {
  section: FileCategorySectionHierarchical;
  isExpanded: boolean;
  hasChildren: boolean;
  onToggle: (fullPath: string) => void;
  onTap?: (fullPath: string) => void;  // 移動モード時のタップハンドラー
  onLongPress?: (fullPath: string, categoryName: string, fileCount: number) => void;  // 長押しハンドラー（カテゴリー操作）
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
  onLongPress,
  isMoveMode = false,
}) => {
  const { colors, spacing, typography, themeMode } = useTheme();

  // 階層レベルに応じたインデント（レベル0はインデントなし、以降設定値pxずつ増加）
  const indentOffset = section.level * FILE_LIST_FLAT_CONFIG.spacing.indentPerLevel;

  /**
   * 階層レベルに応じた背景色を計算
   * secondary色をベースに、レベルが深くなるほど明度を変化させる（完全不透明）
   * - ライトテーマ: レベルが深いほど明るくする（白色を混ぜる）
   * - ダークテーマ: レベルが深いほど暗くする（黒色を混ぜる）
   */
  const getBackgroundColor = (level: number): string => {
    // secondary色からRGB値を抽出
    const hex = colors.secondary.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // レベルに応じた色変化の係数
    const changeFactor = Math.min(
      level * FILE_LIST_FLAT_CONFIG.category.colorChange.multiplier,
      FILE_LIST_FLAT_CONFIG.category.colorChange.max
    );

    let newR: number, newG: number, newB: number;

    if (themeMode === 'dark') {
      // ダークテーマ: 黒色を混ぜて暗くする
      newR = Math.round(r * (1 - changeFactor));
      newG = Math.round(g * (1 - changeFactor));
      newB = Math.round(b * (1 - changeFactor));
    } else {
      // ライトテーマ: 白色を混ぜて明るくする
      newR = Math.round(r + (255 - r) * changeFactor);
      newG = Math.round(g + (255 - g) * changeFactor);
      newB = Math.round(b + (255 - b) * changeFactor);
    }

    // RGB値を16進数に変換
    const toHex = (value: number) => value.toString(16).padStart(2, '0');
    return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
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

  // 長押しハンドラー（移動モード中は無効）
  const handleLongPress = () => {
    if (!isMoveMode && onLongPress) {
      onLongPress(section.fullPath, section.category, section.fileCount);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.sectionHeaderWrapper,
        {
          paddingLeft: indentOffset,
        },
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={FILE_LIST_FLAT_CONFIG.interaction.activeOpacity}
    >
      <View
        style={[
          styles.sectionHeaderContent,
          {
            backgroundColor: headerBackgroundColor,
            borderBottomColor: colors.tertiary,
          },
        ]}
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
              ...typography.category,
              color: colors.text,
            },
          ]}
        >
          {section.category} ({section.fileCount})
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  sectionHeaderWrapper: {
    // 外側のコンテナ - インデント用の余白を設定
  },
  sectionHeaderContent: {
    // 内側のコンテナ - 背景色と実際のコンテンツを表示
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: FILE_LIST_FLAT_CONFIG.spacing.sectionHeader.vertical,
    paddingHorizontal: FILE_LIST_FLAT_CONFIG.spacing.sectionHeader.horizontal,
    borderBottomWidth: 1,
  },
  sectionHeaderText: {
    fontWeight: 'bold',
  },
});
