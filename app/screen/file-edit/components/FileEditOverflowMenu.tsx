import React from 'react';
import { View, Modal, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../design/theme/ThemeContext';

interface FileEditOverflowMenuProps {
  visible: boolean;
  onClose: () => void;
  onToggleViewMode: () => void;
}

export const FileEditOverflowMenu: React.FC<FileEditOverflowMenuProps> = ({
  visible,
  onClose,
  onToggleViewMode,
}) => {
  const { colors, spacing } = useTheme();

  const handleMenuItemPress = (action: () => void) => {
    onClose();
    action();
  };

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
    },
    menuItemText: {
      color: colors.text,
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
            onPress={() => handleMenuItemPress(onToggleViewMode)}
          >
            <Ionicons name="eye-outline" size={24} color={colors.text} />
            <Text style={styles.menuItemText}>ビューモード切替</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};
