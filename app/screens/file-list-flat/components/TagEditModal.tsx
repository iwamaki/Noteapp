/**
 * @file TagEditModal.tsx
 * @summary ファイルのタグ編集モーダル
 * @description
 * ファイルに紐づくタグを編集するモーダル。
 * カンマ区切りまたはスペース区切りで複数のタグを入力可能。
 * InputFormModalを活用してUI統一。
 */

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../design/theme/ThemeContext';
import { InputFormModal } from '../../../components/InputFormModal';
import { TagEditModalProps } from '../types';

export const TagEditModal: React.FC<TagEditModalProps> = ({
  visible,
  initialTags,
  fileName,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();
  const { colors, typography, spacing } = useTheme();

  const handleSave = (inputValue: string) => {
    // カンマまたはスペースで分割し、#を削除、空白を削除してフィルタリング
    const tags = inputValue
      .split(/[,\s]+/)
      .map((tag) => tag.trim().replace(/^#/, ''))
      .filter((tag) => tag.length > 0);

    onSave(tags);
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
      title={t('modals.tagEdit.title')}
      message={t('modals.tagEdit.message', { fileName })}
      initialValue={initialTags.join(', ')}
      placeholder={t('modals.tagEdit.placeholder')}
      onClose={onClose}
      onSubmit={handleSave}
      multiline
    >
      <Text style={styles.hint}>
        {t('modals.tagEdit.hint')}
      </Text>
    </InputFormModal>
  );
};
