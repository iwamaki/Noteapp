/**
 * @file SummaryEditModal.tsx
 * @summary 要約編集モーダルコンポーネント
 * @description
 * ファイルの要約をモーダルで編集・保存できる機能を提供。
 * 将来的にLLM自動生成機能も追加予定。
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../design/theme/ThemeContext';
import { CustomModal } from '../../../components/CustomModal';

interface SummaryEditModalProps {
  visible: boolean;
  initialSummary: string;
  onClose: () => void;
  onSave: (summary: string) => void;
}

export const SummaryEditModal: React.FC<SummaryEditModalProps> = ({
  visible,
  initialSummary,
  onClose,
  onSave,
}) => {
  const { colors, spacing, typography, iconSizes } = useTheme();
  const [summary, setSummary] = useState(initialSummary);

  // モーダルが開いたときに初期値を設定
  useEffect(() => {
    if (visible) {
      setSummary(initialSummary);
    }
  }, [visible, initialSummary]);

  const handleSave = () => {
    onSave(summary.trim());
    onClose();
  };

  const handleCancel = () => {
    setSummary(initialSummary);
    onClose();
  };

  const styles = StyleSheet.create({
    textArea: {
      ...typography.body,
      color: colors.text,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minHeight: 120,
      textAlignVertical: 'top',
    },
    hint: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
      fontStyle: 'italic',
    },
    llmButtonContainer: {
      marginTop: spacing.md,
    },
    llmButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.success,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: spacing.sm,
      opacity: 0.5,
    },
    llmButtonText: {
      ...typography.body,
      fontWeight: '600',
      color: colors.textSecondary,
      marginLeft: spacing.sm,
    },
  });

  return (
    <CustomModal
      isVisible={visible}
      title="要約の編集"
      onClose={handleCancel}
      buttons={[
        {
          text: 'キャンセル',
          style: 'cancel',
          onPress: handleCancel,
        },
        {
          text: '保存',
          style: 'default',
          onPress: handleSave,
        },
      ]}
    >
      <TextInput
        value={summary}
        onChangeText={setSummary}
        placeholder="ファイルの内容を簡潔に要約してください..."
        placeholderTextColor={colors.textSecondary}
        multiline
        style={styles.textArea}
        textAlignVertical="top"
      />
      <Text style={styles.hint}>
        このファイルの内容を1〜2文で要約します。
      </Text>

      {/* LLM生成ボタン（将来実装） */}
      <View style={styles.llmButtonContainer}>
        <TouchableOpacity
          style={styles.llmButton}
          disabled={true}
        >
          <Ionicons name="sparkles" size={iconSizes.small} color={colors.textSecondary} />
          <Text style={styles.llmButtonText}>
            LLMで自動生成
          </Text>
        </TouchableOpacity>
      </View>
    </CustomModal>
  );
};
