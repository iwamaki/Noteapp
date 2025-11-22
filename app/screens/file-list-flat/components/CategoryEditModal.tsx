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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      title={t('modals.categoryEdit.title')}
      message={t('modals.categoryEdit.message', { fileName })}
      initialValue={initialCategory}
      placeholder={t('modals.categoryEdit.placeholder')}
      onClose={onClose}
      onSubmit={handleSave}
    >
      <Text style={styles.hint}>
        {t('modals.categoryEdit.hint')}
      </Text>
    </InputFormModal>
  );
};
