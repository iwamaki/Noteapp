/**
 * @file TagEditModal.tsx
 * @summary ファイルのタグ編集モーダル
 * @description
 * ファイルに紐づくタグを編集するモーダル。
 * カンマ区切りまたはスペース区切りで複数のタグを入力可能。
 * CustomModalを活用してUI統一。
 */

import React, { useState, useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import { CustomInlineInput } from '../../../components/CustomInlineInput';
import { useTheme } from '../../../design/theme/ThemeContext';
import { CustomModal } from '../../../components/CustomModal';

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
      // カンマ区切りで表示（#なし）
      setInputValue(initialTags.join(', '));
    }
  }, [visible, initialTags]);

  const handleSave = () => {
    // カンマまたはスペースで分割し、#を削除、空白を削除してフィルタリング
    const tags = inputValue
      .split(/[,\s]+/)
      .map((tag) => tag.trim().replace(/^#/, ''))
      .filter((tag) => tag.length > 0);

    onSave(tags);
    onClose();
  };

  return (
    <CustomModal
      isVisible={visible}
      title="タグを編集"
      message={`「${fileName}」のタグを編集します。`}
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
        placeholder="例: 重要, todo, アイデア"
        placeholderTextColor={colors.textSecondary}
        value={inputValue}
        onChangeText={setInputValue}
        onClear={() => setInputValue('')}
        autoFocus
        onSubmitEditing={handleSave}
        multiline
      />
      <Text style={styles.hint}>
        複数のタグはカンマ（,）またはスペースで区切って入力してください。#は自動で削除されます。
      </Text>
    </CustomModal>
  );
};
