/**
 * @file CategoryMoveModal.tsx
 * @summary カテゴリー移動モーダル
 * @description
 * カテゴリーを別の場所に移動するモーダル。
 * 影響範囲を表示し、配下のファイル・子カテゴリーも一緒に移動される。
 */

import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CustomInlineInput } from '../../../components/CustomInlineInput';
import { useTheme } from '../../../design/theme/ThemeContext';
import { CustomModal } from '../../../components/CustomModal';
import { CategoryImpact } from '@data/services/categoryOperationsService';

interface CategoryMoveModalProps {
  visible: boolean;
  categoryPath: string;
  categoryName: string;
  impact: CategoryImpact | null;
  onClose: () => void;
  onMove: (newPath: string) => void;
}

export const CategoryMoveModal: React.FC<CategoryMoveModalProps> = ({
  visible,
  categoryPath,
  impact,
  onClose,
  onMove,
}) => {
  const { colors, typography, spacing } = useTheme();
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (visible) {
      // デフォルトは空（ユーザーに入力してもらう）
      setInputValue('');
    }
  }, [visible]);

  const handleMove = () => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue || trimmedValue === categoryPath) {
      return;
    }

    onMove(trimmedValue);
  };

  const styles = StyleSheet.create({
    hint: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
      marginBottom: spacing.sm,
      fontSize: 12,
    },
    currentPath: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    currentPathLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      fontSize: 11,
      marginBottom: 4,
    },
    currentPathText: {
      ...typography.body,
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
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
    <CustomModal
      isVisible={visible}
      title="カテゴリーを移動"
      message="移動先のカテゴリーパスを入力してください。"
      onClose={onClose}
      buttons={[
        {
          text: 'キャンセル',
          style: 'cancel',
          onPress: onClose,
        },
        {
          text: '移動',
          style: 'default',
          onPress: handleMove,
        },
      ]}
    >
      {/* 現在のパス */}
      <View style={styles.currentPath}>
        <Text style={styles.currentPathLabel}>現在のパス</Text>
        <Text style={styles.currentPathText}>{categoryPath}</Text>
      </View>

      {/* 移動先入力 */}
      <CustomInlineInput
        placeholder="例: 技術/プログラミング"
        value={inputValue}
        onChangeText={setInputValue}
        onClear={() => setInputValue('')}
        autoFocus
        onSubmitEditing={handleMove}
      />
      <Text style={styles.hint}>
        階層構造を表すには「/」で区切ってください
      </Text>

      {/* 影響範囲の表示 */}
      {impact && impact.totalFileCount > 0 && (
        <View style={styles.impactInfo}>
          <Text style={styles.impactTitle}>移動される内容</Text>
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
            合計 {impact.totalFileCount}個のファイルが移動されます
          </Text>
        </View>
      )}
    </CustomModal>
  );
};
