/**
 * @file TreeListItem.tsx
 * @summary ツリー構造用のリストアイテムコンポーネント
 * @responsibility インデント、展開/折りたたみアイコン、フォルダ/ノートの視覚的表現
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../design/theme/ThemeContext';
import { TreeNode } from '../utils/treeUtils';
import { ListItem } from '../../../components/ListItem';
import { Note, Folder } from '@shared/types/note';

interface TreeListItemProps {
  node: TreeNode;
  isSelected: boolean;
  isSelectionMode: boolean;
  onPress: () => void;
  onLongPress: () => void;
  isMoveMode: boolean; // New prop
  onSelectDestinationFolder: (folder: Folder) => void; // New prop
}

export const TreeListItem: React.FC<TreeListItemProps> = ({
  node,
  isSelected,
  isSelectionMode,
  onPress,
  onLongPress,
  isMoveMode, // Destructure new prop
  onSelectDestinationFolder, // Destructure new prop
}) => {
  const { colors, spacing, typography } = useTheme();
  const indentSize = node.depth * 20;

  const styles = StyleSheet.create({
    container: {
      marginLeft: spacing.md + indentSize,
      marginRight: spacing.md,
    },
    contentContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconContainer: {
      marginRight: spacing.sm,
      width: 24,
      alignItems: 'center',
    },
    iconPlaceholder: {
      width: 16,
    },
    expandIcon: {
      ...typography.body,
      fontSize: 16,
      color: colors.textSecondary,
    },
    textContainer: {
      flex: 1,
    },
  });

  const renderIcon = () => {
    if (node.type === 'folder') {
      const expandIcon = node.isExpanded ? '▼' : '▶';
      return <Text style={styles.expandIcon}>{expandIcon}</Text>;
    }
    return <View style={styles.iconPlaceholder} />; // フォルダでない場合にスペースを確保
  };

  const renderTitle = () => {
    if (node.type === 'folder') {
      const folder = node.item as Folder;
      return `📁 ${folder.name}`;
    }
    const note = node.item as Note;
    return note.title || '無題のノート';
  };

  const renderSubtitle = () => {
    if (node.type === 'note') {
      const note = node.item as Note;
      return note.content ? (
        <ListItem.Description numberOfLines={1}>
          {note.content}
        </ListItem.Description>
      ) : null;
    }
    return null;
  };

  const handlePress = () => {
    if (isMoveMode && node.type === 'folder') {
      onSelectDestinationFolder(node.item as Folder);
    } else {
      onPress();
    }
  };

  return (
    <View style={styles.container}>
      <ListItem.Container
        onPress={handlePress}
        onLongPress={onLongPress}
        isSelected={isSelected}
        isSelectionMode={isSelectionMode}
      >
        <View style={styles.contentContainer}>
          <View style={styles.iconContainer}>{renderIcon()}</View>
          <View style={styles.textContainer}>
            <ListItem.Title numberOfLines={1}>{renderTitle()}</ListItem.Title>
            {renderSubtitle()}
          </View>
        </View>
      </ListItem.Container>
    </View>
  );
};
