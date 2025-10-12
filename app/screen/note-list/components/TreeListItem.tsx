/**
 * @file TreeListItem.tsx
 * @summary ツリー構造用のリストアイテムコンポーネント
 * @responsibility インデント、展開/折りたたみアイコン、フォルダ/ノートの視覚的表現、ドラッグハンドル
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../design/theme/ThemeContext';
import { TreeNode } from '../utils/treeUtils';

interface TreeListItemProps {
  node: TreeNode;
  isSelected: boolean;
  isSelectionMode: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

export const TreeListItem: React.FC<TreeListItemProps> = ({
  node,
  isSelected,
  isSelectionMode,
  onPress,
  onLongPress,
}) => {
  const { colors, spacing, typography, shadows } = useTheme();

  // インデントの計算（各階層ごとに20pxずつ）
  const indentSize = node.depth * 20;

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      borderRadius: 8,
      marginBottom: spacing.md,
      marginLeft: spacing.md + indentSize,
      marginRight: spacing.md,
      padding: spacing.md,
      ...shadows.small,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.transparent,
    },
    selected: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary,
    },
    selectionMode: {
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      marginRight: spacing.sm,
      width: 24,
      alignItems: 'center',
    },
    expandIcon: {
      ...typography.body,
      fontSize: 16,
      color: colors.textSecondary,
    },
    textContainer: {
      flex: 1,
    },
    title: {
      ...typography.title,
      color: colors.text,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: spacing.xs / 2,
    },
    checkboxContainer: {
      marginLeft: spacing.md,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: colors.textSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.transparent,
    },
    checkboxSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checkboxText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: 'bold',
    },
  });

  const renderIcon = () => {
    if (node.type === 'folder') {
      // フォルダの展開/折りたたみアイコン
      const expandIcon = node.isExpanded ? '▼' : '▶';
      return <Text style={styles.expandIcon}>{expandIcon}</Text>;
    }
    return null;
  };

  const renderTitle = () => {
    if (node.type === 'folder') {
      const folder = node.item as any;
      return `📁 ${folder.name}`;
    } else {
      const note = node.item as any;
      return note.title || '無題のノート';
    }
  };

  const renderSubtitle = () => {
    if (node.type === 'note') {
      const note = node.item as any;
      if (note.content) {
        return (
          <Text style={styles.subtitle} numberOfLines={1}>
            {note.content}
          </Text>
        );
      }
    }
    return null;
  };

  return (
    <View
      style={[
        styles.container,
        isSelected && styles.selected,
        isSelectionMode && styles.selectionMode,
      ]}
    >
      {/* メインコンテンツ */}
      <TouchableOpacity
        style={styles.content}
        onPress={onPress}
        onLongPress={onLongPress}
      >
        <View style={styles.iconContainer}>{renderIcon()}</View>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {renderTitle()}
          </Text>
          {renderSubtitle()}
        </View>
      </TouchableOpacity>

      {/* 選択モードのチェックボックス */}
      {isSelectionMode && (
        <View style={styles.checkboxContainer}>
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Text style={styles.checkboxText}>✓</Text>}
          </View>
        </View>
      )}
    </View>
  );
};
