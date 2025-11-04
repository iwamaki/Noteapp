import React from 'react';
import { View, Modal, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../design/theme/ThemeContext';

interface FileEditOverflowMenuProps {
  visible: boolean;
  onClose: () => void;
}

export const FileEditOverflowMenu: React.FC<FileEditOverflowMenuProps> = ({
  visible,
  onClose,
}) => {
  const { colors, spacing, iconSizes } = useTheme();

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
    },
    menuContainer: {
      backgroundColor: colors.background,
      borderRadius: spacing.sm,
      paddingVertical: spacing.sm,
      marginRight: spacing.md,
      marginTop: 50, // Adjust this value to position the menu correctly
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    menuItem: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      opacity: 0.5,
    },
    menuItemText: {
      color: colors.textSecondary,
      fontSize: 16,
      marginLeft: spacing.md,
    },
  });

  return (
    <Modal
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            disabled={true}
          >
            <Ionicons name="settings-outline" size={iconSizes.medium} color={colors.textSecondary} />
            <Text style={styles.menuItemText}>設定（準備中）</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            disabled={true}
          >
            <Ionicons name="share-outline" size={iconSizes.medium} color={colors.textSecondary} />
            <Text style={styles.menuItemText}>共有（準備中）</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            disabled={true}
          >
            <Ionicons name="download-outline" size={iconSizes.medium} color={colors.textSecondary} />
            <Text style={styles.menuItemText}>エクスポート（準備中）</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};
