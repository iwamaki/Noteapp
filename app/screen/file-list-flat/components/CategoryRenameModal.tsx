/**
 * @file CategoryRenameModal.tsx
 * @summary カテゴリー名変更モーダル
 * @description
 * カテゴリーの名前を変更するモーダル。
 * 影響範囲を表示し、配下のファイル・子カテゴリーも一緒に更新される。
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../design/theme/ThemeContext';
import { InputFormModal } from '../../../components/InputFormModal';
import { CategoryImpact } from '@data/services/categoryOperationsService';

interface CategoryRenameModalProps {
  visible: boolean;
  categoryPath: string;
  categoryName: string;
  impact: CategoryImpact | null;
  onClose: () => void;
  onRename: (newPath: string) => void;
}

export const CategoryRenameModal: React.FC<CategoryRenameModalProps> = ({
  visible,
  categoryPath,
  categoryName,
  impact,
  onClose,
  onRename,
}) => {
  const { colors, typography, spacing } = useTheme();

  const handleRename = (newName: string) => {
    // 新しいパスを構築
    const parts = categoryPath.split('/');
    parts[parts.length - 1] = newName;
    const newPath = parts.join('/');

    onRename(newPath);
  };

  const styles = StyleSheet.create({
    impactInfo: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: spacing.sm,
      marginTop: spacing.sm,
    },
    impactText: {
      ...typography.caption,
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
    },
    impactTitle: {
      ...typography.body,
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
  });

  return (
    <InputFormModal
      visible={visible}
      title="カテゴリー名を変更"
      message="新しいカテゴリー名を入力してください。"
      initialValue={categoryName}
      placeholder="新しいカテゴリー名"
      onClose={onClose}
      onSubmit={handleRename}
      submitButtonText="変更"
      validateInput={(value) => value.length > 0}
    >
      {/* 影響範囲の表示 */}
      {impact && impact.totalFileCount > 0 && (
        <View style={styles.impactInfo}>
          <Text style={styles.impactTitle}>影響範囲</Text>
          <Text style={styles.impactText}>
            • 直接属するファイル: {impact.directFileCount}個
          </Text>
          {impact.childCategories.length > 0 && (
            <Text style={styles.impactText}>
              • 子カテゴリー: {impact.childCategories.length}個 (
              {impact.totalFileCount - impact.directFileCount}個のファイル)
            </Text>
          )}
          <Text style={[styles.impactText, { marginTop: spacing.xs }]}>
            合計 {impact.totalFileCount}個のファイルが更新されます
          </Text>
        </View>
      )}
    </InputFormModal>
  );
};
