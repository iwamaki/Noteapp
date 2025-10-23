/**
 * @file TreeListItem.tsx
 * @summary ツリー構造用のリストアイテムコンポーネント
 * @responsibility インデント、展開/折りたたみアイコン、フォルダ/ファイルの視覚的表現
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../design/theme/ThemeContext';
import { TreeNode } from '../utils/treeUtils';
import { ListItem } from '../../../components/ListItem';
import { File, Folder } from '@data/type';

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
      marginLeft: spacing.md - spacing.xs + indentSize, // Adjusted for more left alignment
      marginRight: spacing.md,
    },
    contentContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconContainer: {
      marginRight: spacing.sm, // Increased gap
      width: 'auto',
      alignItems: 'flex-start',
    },
    iconPlaceholder: {
      width: 16,
    },
    textContainer: {
      flex: 1,
    },
  });

  const renderIcon = () => {
    if (node.type === 'folder') {
      return (
        <MaterialCommunityIcons
          name={node.isExpanded ? 'folder-open' : 'folder'}
          size={typography.body.fontSize * 1.7}
          color={colors.textSecondary}
        />
      );
    } else if (node.type === 'file') {
      return (
        <MaterialCommunityIcons
          name="file-document"
          size={typography.body.fontSize * 1.7}
          color={colors.textSecondary}
        />
      );
    }
    return <View style={styles.iconPlaceholder} />; // フォルダでもノートでもない場合にスペースを確保
  };

  const renderTitle = () => {
    if (node.type === 'folder') {
      const folder = node.item as Folder;
      return folder.name;
    }
    const file = node.item as File;
    return file.title || '無題のノート';
  };

  const renderSubtitle = () => {
    if (node.type === 'file') {
      const file = node.item as File;
      return file.content ? (
        <ListItem.Description numberOfLines={1}>
          {file.content}
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
