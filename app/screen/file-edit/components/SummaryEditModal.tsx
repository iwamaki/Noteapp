/**
 * @file SummaryEditModal.tsx
 * @summary 要約編集モーダルコンポーネント
 * @description
 * ファイルの要約をモーダルで編集・保存できる機能を提供。
 * 将来的にLLM自動生成機能も追加予定。
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../design/theme/ThemeContext';
import { CustomModal } from '../../../components/CustomModal';
import APIService from '../../../features/chat/llmService/api';

interface SummaryEditModalProps {
  visible: boolean;
  initialSummary: string;
  fileContent: string;
  fileTitle: string;
  onClose: () => void;
  onSave: (summary: string) => void;
}

export const SummaryEditModal: React.FC<SummaryEditModalProps> = ({
  visible,
  initialSummary,
  fileContent,
  fileTitle,
  onClose,
  onSave,
}) => {
  const { colors, spacing, typography, iconSizes } = useTheme();
  const [summary, setSummary] = useState(initialSummary);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // モーダルが開いたときに初期値を設定
  useEffect(() => {
    if (visible) {
      setSummary(initialSummary);
      setError(null);
    }
  }, [visible, initialSummary]);

  const handleSave = () => {
    onSave(summary.trim());
    onClose();
  };

  const handleCancel = () => {
    setSummary(initialSummary);
    setError(null);
    onClose();
  };

  const handleGenerateSummary = async () => {
    if (!fileContent || !fileTitle) {
      setError('文書の内容またはタイトルが取得できません');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const generatedSummary = await APIService.summarizeDocument(
        fileContent,
        fileTitle
      );
      setSummary(generatedSummary);
    } catch (err) {
      console.error('要約生成エラー:', err);
      setError('要約の生成に失敗しました。もう一度お試しください。');
    } finally {
      setIsGenerating(false);
    }
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
    },
    llmButtonDisabled: {
      opacity: 0.5,
    },
    llmButtonText: {
      ...typography.body,
      fontWeight: '600',
      color: colors.background,
      marginLeft: spacing.sm,
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
      marginTop: spacing.xs,
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
        このファイルの内容を簡潔に要約します。
      </Text>

      {/* エラーメッセージ */}
      {error && (
        <Text style={styles.errorText}>
          {error}
        </Text>
      )}

      {/* LLM生成ボタン */}
      <View style={styles.llmButtonContainer}>
        <TouchableOpacity
          style={[styles.llmButton, isGenerating && styles.llmButtonDisabled]}
          disabled={isGenerating}
          onPress={handleGenerateSummary}
        >
          {isGenerating ? (
            <>
              <ActivityIndicator size="small" color={colors.background} />
              <Text style={styles.llmButtonText}>
                生成中...
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="sparkles" size={iconSizes.small} color={colors.background} />
              <Text style={styles.llmButtonText}>
                LLMで自動生成
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </CustomModal>
  );
};
