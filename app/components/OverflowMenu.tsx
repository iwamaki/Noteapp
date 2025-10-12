import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../design/theme/ThemeContext';
import { HeaderButton } from './HeaderButton';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';

interface OverflowMenuProps {
  onCreateNew: () => void;
}

type NoteListScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'NoteList'
>;

export const OverflowMenu: React.FC<OverflowMenuProps> = ({ onCreateNew }) => {
  const { colors, spacing } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const navigation = useNavigation<NoteListScreenNavigationProp>();

  const handleSettingsPress = () => {
    setModalVisible(false);
    navigation.navigate('Settings');
  };

  const handleCreateNewPress = () => {
    setModalVisible(false);
    onCreateNew();
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
    <View>
      <HeaderButton
        iconName="ellipsis-vertical"
        onPress={() => setModalVisible(true)}
      />

      <Modal
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        animationType="fade"
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={handleCreateNewPress}>
              <Ionicons name="add" size={24} color={colors.text} />
              <Text style={styles.menuItemText}>新規作成</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleSettingsPress}>
              <Ionicons name="settings" size={24} color={colors.text} />
              <Text style={styles.menuItemText}>設定</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};
