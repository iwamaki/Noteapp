/**
 * @file RenameItemModal.tsx
 * @summary アイテム（ノート/フォルダ）の名前変更モーダル
 */
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../../design/theme/ThemeContext';

interface RenameItemModalProps {
  visible: boolean;
  initialName: string;
  itemType: 'note' | 'folder';
  onClose: () => void;
  onRename: (newName: string) => void;
}

export const RenameItemModal: React.FC<RenameItemModalProps> = ({
  visible,
  initialName,
  itemType,
  onClose,
  onRename,
}) => {
  const { colors, spacing, typography, shadows } = useTheme();
  const [inputValue, setInputValue] = useState(initialName);

  useEffect(() => {
    if (visible) {
      setInputValue(initialName);
    }
  }, [visible, initialName]);

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: spacing.xl,
      width: '85%',
      maxWidth: 400,
      ...shadows.large,
    },
    title: {
      ...typography.title,
      fontSize: 20,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    description: {
      ...typography.body,
      color: colors.textSecondary,
      marginBottom: spacing.md,
      lineHeight: 20,
    },
    input: {
      ...typography.body,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: spacing.md,
      marginBottom: spacing.lg,
      color: colors.text,
      backgroundColor: colors.secondary,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.md,
    },
    button: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: 8,
      minWidth: 80,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    renameButton: {
      backgroundColor: colors.primary,
    },
    buttonText: {
      ...typography.body,
      fontWeight: '600',
    },
    cancelButtonText: {
      color: colors.text,
    },
    renameButtonText: {
      color: colors.white,
    },
    disabledButton: {
      opacity: 0.5,
    },
  });

  const handleRename = () => {
    if (inputValue.trim() && inputValue.trim() !== initialName) {
      onRename(inputValue.trim());
      onClose();
    }
  };

  const handleCancel = () => {
    setInputValue(initialName); // キャンセル時は元の名前に戻す
    onClose();
  };

  const isRenameDisabled = !inputValue.trim() || inputValue.trim() === initialName;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleCancel}
        />
        <View style={styles.modalContainer}>
          <Text style={styles.title}>{itemType === 'folder' ? 'フォルダ名を変更' : 'ノート名を変更'}</Text>
          <Text style={styles.description}>
            新しい{itemType === 'folder' ? 'フォルダ名' : 'ノート名'}を入力してください。
          </Text>

          <TextInput
            style={styles.input}
            placeholder={itemType === 'folder' ? '新しいフォルダ名' : '新しいノート名'}
            placeholderTextColor={colors.textSecondary}
            value={inputValue}
            onChangeText={setInputValue}
            autoFocus
            onSubmitEditing={handleRename}
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
            >
              <Text style={[styles.buttonText, styles.cancelButtonText]}>
                キャンセル
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.renameButton,
                isRenameDisabled && styles.disabledButton,
              ]}
              onPress={handleRename}
              disabled={isRenameDisabled}
            >
              <Text style={[styles.buttonText, styles.renameButtonText]}>
                変更
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
