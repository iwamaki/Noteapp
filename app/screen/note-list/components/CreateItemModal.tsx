/**
 * @file CreateItemModal.tsx
 * @summary ノート/フォルダ作成モーダル - パス指定に対応
 * @responsibility "aaa/bbb/note.txt" のような入力からフォルダ構造を自動作成
 */
import React, { useState } from 'react';
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

interface CreateItemModalProps {
  visible: boolean;
  currentPath: string;
  onClose: () => void;
  onCreate: (inputPath: string) => void;
}

export const CreateItemModal: React.FC<CreateItemModalProps> = ({
  visible,
  currentPath,
  onClose,
  onCreate,
}) => {
  const { colors, spacing, typography, shadows } = useTheme();
  const [inputValue, setInputValue] = useState('');

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
    currentPathLabel: {
      ...typography.body,
      color: colors.textSecondary,
      fontSize: 12,
      marginBottom: spacing.xs,
    },
    currentPath: {
      ...typography.body,
      color: colors.primary,
      fontWeight: '600',
      marginBottom: spacing.md,
    },
    input: {
      ...typography.body,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: spacing.md,
      marginBottom: spacing.md,
      color: colors.text,
      backgroundColor: colors.secondary,
    },
    exampleText: {
      ...typography.body,
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: spacing.lg,
      fontStyle: 'italic',
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
    createButton: {
      backgroundColor: colors.primary,
    },
    buttonText: {
      ...typography.body,
      fontWeight: '600',
    },
    cancelButtonText: {
      color: colors.text,
    },
    createButtonText: {
      color: colors.white,
    },
    disabledButton: {
      opacity: 0.5,
    },
  });

  const handleCreate = () => {
    if (inputValue.trim()) {
      onCreate(inputValue.trim());
      setInputValue('');
      onClose();
    }
  };

  const handleCancel = () => {
    setInputValue('');
    onClose();
  };

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
          <Text style={styles.title}>新規作成</Text>
          <Text style={styles.description}>
            ファイル名またはパスを入力してください。
            {'\n'}フォルダは自動的に作成されます。
          </Text>

          <Text style={styles.currentPathLabel}>現在の場所：</Text>
          <Text style={styles.currentPath}>{currentPath}</Text>

          <TextInput
            style={styles.input}
            placeholder="例: note.txt または folder1/note.txt"
            placeholderTextColor={colors.textSecondary}
            value={inputValue}
            onChangeText={setInputValue}
            autoFocus
            onSubmitEditing={handleCreate}
          />

          <Text style={styles.exampleText}>
            💡 &quot;aaa/bbb/note.txt&quot; と入力すると、
            {'\n'}   aaa/bbb フォルダが自動作成されます
          </Text>

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
                styles.createButton,
                !inputValue.trim() && styles.disabledButton,
              ]}
              onPress={handleCreate}
              disabled={!inputValue.trim()}
            >
              <Text style={[styles.buttonText, styles.createButtonText]}>
                作成
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
