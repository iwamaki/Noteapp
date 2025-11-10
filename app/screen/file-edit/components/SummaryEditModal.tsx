/**
 * @file SummaryEditModal.tsx
 * @summary 要約編集モーダルコンポーネント
 * @description
 * ファイルの要約をモーダルで編集・保存できる機能を提供。
 * 将来的にLLM自動生成機能も追加予定。
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
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
  const { colors, spacing, typography } = useTheme();
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

    // 最低文字数チェック（100文字）
    const MIN_CONTENT_LENGTH = 100;
    if (fileContent.trim().length < MIN_CONTENT_LENGTH) {
      setError(`文書が短すぎます。要約を生成するには、少なくとも${MIN_CONTENT_LENGTH}文字以上の内容が必要です。`);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await APIService.summarizeDocument(
        fileContent,
        fileTitle
      );
      setSummary(response.summary);

      // トークン使用量を記録
      if (response.inputTokens && response.outputTokens && response.model) {
        const { trackAndDeductTokens } = await import('../../../billing/utils/tokenTrackingHelper');
        await trackAndDeductTokens(response.inputTokens, response.outputTokens, response.model);
      }
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
    llmButton: {
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
      fontSize: (typography.body.fontSize || 16) * 0.875, // 1段階小さく
      fontWeight: '600',
      color: colors.white,
      textAlign: 'center',
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
      marginTop: spacing.xs,
    },
  });

  // 自動生成ボタンをカスタムコンポーネントとして定義
  const generateButton = (
    <TouchableOpacity
      style={[styles.llmButton, isGenerating && styles.llmButtonDisabled]}
      disabled={isGenerating}
      onPress={handleGenerateSummary}
    >
      {isGenerating ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <ActivityIndicator size="small" color={colors.white} />
          <Text style={styles.llmButtonText}>生成中...</Text>
        </View>
      ) : (
        <Text style={styles.llmButtonText}>要約生成</Text>
      )}
    </TouchableOpacity>
  );

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
          text: '要約生成',
          style: 'default',
          onPress: handleGenerateSummary,
          customComponent: generateButton,
        },
        {
          text: '適用',
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
    </CustomModal>
  );
};
