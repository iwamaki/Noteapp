/**
 * @file CreateItemModal.tsx
 * @summary ノート/フォルダ作成モーダル - パス指定に対応
 * @responsibility "aaa/bbb/file.txt" のような入力からフォルダ構造を自動作成
 */
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../../design/theme/ThemeContext';
import { CustomModal } from '../../../components/CustomModal';

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
  const { colors, spacing, typography } = useTheme();
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (visible) {
      setInputValue('');
    }
  }, [visible]);

  const handleCreate = () => {
    if (inputValue.trim()) {
      onCreate(inputValue.trim());
      onClose();
    }
  };

  const styles = StyleSheet.create({
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
      fontStyle: 'italic',
    },
  });

  return (
    <CustomModal
      isVisible={visible}
      title="新規作成"
      message={`ファイル名またはパスを入力してください。\nフォルダは自動的に作成されます。`}
      onClose={onClose}
      buttons={[
        {
          text: 'キャンセル',
          style: 'cancel',
          onPress: onClose,
        },
        {
          text: '作成',
          style: 'default',
          onPress: handleCreate,
        },
      ]}
    >
      <View>
        <Text style={styles.currentPathLabel}>現在の場所：</Text>
        <Text style={styles.currentPath}>{currentPath}</Text>

        <TextInput
          style={styles.input}
          placeholder="例: file.txt または folder1/file.txt"
          placeholderTextColor={colors.textSecondary}
          value={inputValue}
          onChangeText={setInputValue}
          autoFocus
          onSubmitEditing={handleCreate}
        />

        <Text style={styles.exampleText}>
          💡 &quot;aaa/bbb/file.txt&quot; と入力すると、
          {'\n'}   aaa/bbb フォルダが自動作成されます
        </Text>
      </View>
    </CustomModal>
  );
};
