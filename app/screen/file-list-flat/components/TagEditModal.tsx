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
import { useTheme } from '../../../design/theme/ThemeContext';
import { InputFormModal } from '../../../components/InputFormModal';

interface TagEditModalProps {
  visible: boolean;
  initialTags: string[];
  fileName: string;
  onClose: () => void;
  onSave: (tags: string[]) => void;
}

export const TagEditModal: React.FC<TagEditModalProps> = ({
  visible,
  initialTags,
  fileName,
  onClose,
  onSave,
}) => {
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
      title="タグを編集"
      message={`「${fileName}」のタグを編集します。`}
      initialValue={initialTags.join(', ')}
      placeholder="例: 重要, todo, アイデア"
      onClose={onClose}
      onSubmit={handleSave}
      multiline
    >
      <Text style={styles.hint}>
        複数のタグはカンマ（,）またはスペースで区切って入力してください。#は自動で削除されます。
      </Text>
    </InputFormModal>
  );
};
