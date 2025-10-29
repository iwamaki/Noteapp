/**
 * @file CategoryEditModal.tsx
 * @summary ファイルのカテゴリー編集モーダル
 * @description
 * ファイルに紐づくカテゴリーを編集するモーダル。
 * カンマ区切りで複数のカテゴリーを入力可能。
 * CustomModalを活用してUI統一。
 */

import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CustomInlineInput } from '../../../components/CustomInlineInput';
import { useTheme } from '../../../design/theme/ThemeContext';
import { CustomModal } from '../../../components/CustomModal';

interface CategoryEditModalProps {
  visible: boolean;
  initialCategories: string[];
  fileName: string;
  onClose: () => void;
  onSave: (categories: string[]) => void;
}

export const CategoryEditModal: React.FC<CategoryEditModalProps> = ({
  visible,
  initialCategories,
  fileName,
  onClose,
  onSave,
}) => {
  const { colors, typography, spacing } = useTheme();
  const [inputValue, setInputValue] = useState('');

  const styles = StyleSheet.create({
    inputBorder: {
      borderWidth: 1,
      borderRadius: 8,
    },
    hint: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
      marginBottom: spacing.sm,
    },
  });

  useEffect(() => {
    if (visible) {
      // カンマ区切りで表示
      setInputValue(initialCategories.join(', '));
    }
  }, [visible, initialCategories]);

  const handleSave = () => {
    // カンマ区切りで分割し、空白を削除してフィルタリング
    const categories = inputValue
      .split(',')
      .map((cat) => cat.trim())
      .filter((cat) => cat.length > 0);

    onSave(categories);
    onClose();
  };

  return (
    <CustomModal
      isVisible={visible}
      title="カテゴリーを編集"
      message={`「${fileName}」のカテゴリーを編集します。`}
      onClose={onClose}
      buttons={[
        {
          text: 'キャンセル',
          style: 'cancel',
          onPress: onClose,
        },
        {
          text: '保存',
          style: 'default',
          onPress: handleSave,
        },
      ]}
    >
      <CustomInlineInput
        style={[
          typography.body,
          styles.inputBorder,
          {
            borderColor: colors.border,
            padding: spacing.md,
            color: colors.text,
            backgroundColor: colors.background,
          },
        ]}
        placeholder="例: 研究, 論文メモ, プロジェクトA"
        placeholderTextColor={colors.textSecondary}
        value={inputValue}
        onChangeText={setInputValue}
        autoFocus
        onSubmitEditing={handleSave}
        multiline
      />
      <Text style={styles.hint}>
        複数のカテゴリーはカンマ（,）で区切って入力してください
      </Text>
    </CustomModal>
  );
};
