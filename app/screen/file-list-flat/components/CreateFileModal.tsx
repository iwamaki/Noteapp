/**
 * @file CreateFileModal.tsx
 * @summary ファイル作成モーダル（フラット構造版）
 * @description
 * パス指定なしでファイルを作成。カテゴリー・タグを直接入力。
 * 既存のCreateItemModalからフォルダ作成機能を削除。
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../../design/theme/ThemeContext';

interface CreateFileModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (title: string, categories: string[], tags: string[]) => void;
}

/**
 * ファイル作成モーダル
 *
 * 既存のCreateItemModalから削除した要素：
 * - フォルダ/ファイル切り替え
 * - パス表示
 * - パス入力
 */
export const CreateFileModal: React.FC<CreateFileModalProps> = ({
  visible,
  onClose,
  onCreate,
}) => {
  const { colors, spacing } = useTheme();
  const [title, setTitle] = useState('');
  const [categoriesText, setCategoriesText] = useState('');
  const [tagsText, setTagsText] = useState('');

  const handleCreate = () => {
    if (!title.trim()) {
      return;
    }

    // カンマ区切りで分割してトリム
    const categories = categoriesText
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    const tags = tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onCreate(title.trim(), categories, tags);

    // リセット
    setTitle('');
    setCategoriesText('');
    setTagsText('');
  };

  const handleCancel = () => {
    setTitle('');
    setCategoriesText('');
    setTagsText('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={handleCancel}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.modalContent,
              { backgroundColor: colors.secondary },
            ]}
          >
            <Text
              style={[
                styles.title,
                { color: colors.text, marginBottom: spacing.md },
              ]}
            >
              新規ファイル作成
            </Text>

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
              カテゴリー（カンマ区切り）
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
              placeholder="例: 研究, 論文メモ"
              placeholderTextColor={colors.textSecondary}
              value={categoriesText}
              onChangeText={setCategoriesText}
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
                  marginBottom: spacing.lg,
                },
              ]}
              placeholder="例: 重要, TODO"
              placeholderTextColor={colors.textSecondary}
              value={tagsText}
              onChangeText={setTagsText}
            />

            {/* ボタン */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: colors.border,
                    marginRight: spacing.sm,
                  },
                ]}
                onPress={handleCancel}
              >
                <Text style={[styles.buttonText, { color: colors.text }]}>
                  キャンセル
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: title.trim()
                      ? colors.primary
                      : colors.border,
                  },
                ]}
                onPress={handleCreate}
                disabled={!title.trim()}
              >
                <Text
                  style={[
                    styles.buttonText,
                    {
                      color: title.trim()
                        ? colors.buttonText
                        : colors.textSecondary,
                    },
                  ]}
                >
                  作成
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 12,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
