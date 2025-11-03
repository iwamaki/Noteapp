/**
 * @file SummaryEditModal.tsx
 * @summary ファイルの要約編集モーダル
 * @description
 * ファイルの要約を編集するモーダル。
 * InputFormModalを活用してUI統一。
 */

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTheme } from '../../../design/theme/ThemeContext';
import { InputFormModal } from '../../../components/InputFormModal';

interface SummaryEditModalProps {
  visible: boolean;
  initialSummary: string;
  fileName: string;
  onClose: () => void;
  onSave: (summary: string) => void;
}

export const SummaryEditModal: React.FC<SummaryEditModalProps> = ({
  visible,
  initialSummary,
  fileName,
  onClose,
  onSave,
}) => {
  const { colors, typography, spacing } = useTheme();

  const handleSave = (summary: string) => {
    onSave(summary.trim());
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
      title="要約を編集"
      message={`「${fileName}」の要約を編集します。`}
      initialValue={initialSummary}
      placeholder="ファイルの内容を簡潔に要約してください..."
      onClose={onClose}
      onSubmit={handleSave}
      multiline
    >
      <Text style={styles.hint}>
        このファイルの内容を1〜2文で要約してください。LLMによる自動生成も将来対応予定です。
      </Text>
    </InputFormModal>
  );
};
