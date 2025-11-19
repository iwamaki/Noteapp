/**
 * @file CategoryEditModal.tsx
 * @summary ファイルのカテゴリー編集モーダル
 * @description
 * ファイルに紐づくカテゴリーを編集するモーダル。
 * 階層パス形式で単一のカテゴリーを入力可能（例: "研究/AI/深層学習"）。
 * InputFormModalを活用してUI統一。
 */

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTheme } from '../../../design/theme/ThemeContext';
import { InputFormModal } from '../../../components/InputFormModal';
import { CategoryEditModalProps } from '../types';

export const CategoryEditModal: React.FC<CategoryEditModalProps> = ({
  visible,
  initialCategory,
  fileName,
  onClose,
  onSave,
}) => {
  const { colors, typography, spacing } = useTheme();

  const handleSave = (category: string) => {
    onSave(category);
    onClose();
  };

  const styles = StyleSheet.create({
    hint: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
      marginBottom: spacing.sm,
    },
  });

  return (
    <InputFormModal
      visible={visible}
      title="カテゴリーを編集"
      message={`「${fileName}」のカテゴリーを編集します。`}
      initialValue={initialCategory}
      placeholder="例: 研究/AI/深層学習"
      onClose={onClose}
      onSubmit={handleSave}
    >
      <Text style={styles.hint}>
        階層構造を表すには「/」で区切ってください（例: 研究/AI）
      </Text>
    </InputFormModal>
  );
};
