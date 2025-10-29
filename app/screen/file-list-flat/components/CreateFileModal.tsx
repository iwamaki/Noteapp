/**
 * @file CreateFileModal.tsx
 * @summary ファイル作成モーダル（フラット構造版）
 * @description
 * パス指定なしでファイルを作成。カテゴリー・タグを直接入力。
 * CustomModalを活用してUI統一。
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../../design/theme/ThemeContext';
import { CustomModal } from '../../../components/CustomModal';

interface CreateFileModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (title: string, category: string, tags: string[]) => void;
}

/**
 * ファイル作成モーダル
 *
 * CustomModalを活用してUI統一。
 * 入力フィールドをchildrenとして渡し、ボタンはbuttonsプロップで定義。
 */
export const CreateFileModal: React.FC<CreateFileModalProps> = ({
  visible,
  onClose,
  onCreate,
}) => {
  const { colors, spacing } = useTheme();
  const [title, setTitle] = useState('');
  const [categoryText, setCategoryText] = useState('');
  const [tagsText, setTagsText] = useState('');

  const handleCreate = () => {
    if (!title.trim()) {
      return;
    }

    // カンマ区切りで分割してトリム（タグのみ）
    const category = categoryText.trim();
    const tags = tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onCreate(title.trim(), category, tags);

    // リセット
    setTitle('');
    setCategoryText('');
    setTagsText('');
  };

  const handleCancel = () => {
    setTitle('');
    setCategoryText('');
    setTagsText('');
    onClose();
  };

  return (
    <CustomModal
      isVisible={visible}
      title="新規ファイル作成"
      buttons={[
        {
          text: 'キャンセル',
          style: 'cancel',
          onPress: handleCancel,
        },
        {
          text: '作成',
          style: title.trim() ? 'default' : 'cancel',
          onPress: title.trim() ? handleCreate : undefined,
        },
      ]}
      onClose={handleCancel}
    >
      <View>
        {/* タイトル入力 */}
        <Text
          style={[
            styles.label,
            { color: colors.textSecondary, marginBottom: spacing.xs },
          ]}
        >
          タイトル
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border,
              padding: spacing.sm,
              marginBottom: spacing.md,
            },
          ]}
          placeholder="ファイルタイトルを入力"
          placeholderTextColor={colors.textSecondary}
          value={title}
          onChangeText={setTitle}
          autoFocus
        />

        {/* カテゴリー入力 */}
        <Text
          style={[
            styles.label,
            { color: colors.textSecondary, marginBottom: spacing.xs },
          ]}
        >
          カテゴリー（階層パス）
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border,
              padding: spacing.sm,
              marginBottom: spacing.md,
            },
          ]}
          placeholder="例: 研究/AI/深層学習"
          placeholderTextColor={colors.textSecondary}
          value={categoryText}
          onChangeText={setCategoryText}
        />

        {/* タグ入力 */}
        <Text
          style={[
            styles.label,
            { color: colors.textSecondary, marginBottom: spacing.xs },
          ]}
        >
          タグ（カンマ区切り）
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border,
              padding: spacing.sm,
            },
          ]}
          placeholder="例: 重要, TODO"
          placeholderTextColor={colors.textSecondary}
          value={tagsText}
          onChangeText={setTagsText}
        />
      </View>
    </CustomModal>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
  },
});
