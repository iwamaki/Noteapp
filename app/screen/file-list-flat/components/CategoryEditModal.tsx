/**
 * @file CategoryEditModal.tsx
 * @summary ファイルのカテゴリー編集モーダル
 * @description
 * ファイルに紐づくカテゴリーを編集するモーダル。
 * 階層パス形式で単一のカテゴリーを入力可能（例: "研究/AI/深層学習"）。
 * CustomModalを活用してUI統一。
 */

import React, { useState, useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import { CustomInlineInput } from '../../../components/CustomInlineInput';
import { useTheme } from '../../../design/theme/ThemeContext';
import { CustomModal } from '../../../components/CustomModal';

interface CategoryEditModalProps {
  visible: boolean;
  initialCategory: string;
  fileName: string;
  onClose: () => void;
  onSave: (category: string) => void;
}

export const CategoryEditModal: React.FC<CategoryEditModalProps> = ({
  visible,
  initialCategory,
  fileName,
  onClose,
  onSave,
}) => {
  const { colors, typography, spacing } = useTheme();
  const [inputValue, setInputValue] = useState('');

  const styles = StyleSheet.create({
    inputBorder: {
      borderWidth: 1,
      borderRadius: 8,
    },
    hint: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
      marginBottom: spacing.sm,
    },
  });

  useEffect(() => {
    if (visible) {
      setInputValue(initialCategory);
    }
  }, [visible, initialCategory]);

  const handleSave = () => {
    const category = inputValue.trim();
    onSave(category);
    onClose();
  };

  return (
    <CustomModal
      isVisible={visible}
      title="カテゴリーを編集"
      message={`「${fileName}」のカテゴリーを編集します。`}
      onClose={onClose}
      buttons={[
        {
          text: 'キャンセル',
          style: 'cancel',
          onPress: onClose,
        },
        {
          text: '保存',
          style: 'default',
          onPress: handleSave,
        },
      ]}
    >
      <CustomInlineInput
        style={[
          typography.body,
          styles.inputBorder,
          {
            borderColor: colors.border,
            padding: spacing.md,
            color: colors.text,
            backgroundColor: colors.background,
          },
        ]}
        placeholder="例: 研究/AI/深層学習"
        placeholderTextColor={colors.textSecondary}
        value={inputValue}
        onChangeText={setInputValue}
        autoFocus
        onSubmitEditing={handleSave}
      />
      <Text style={styles.hint}>
        階層構造を表すには「/」で区切ってください（例: 研究/AI）
      </Text>
    </CustomModal>
  );
};
