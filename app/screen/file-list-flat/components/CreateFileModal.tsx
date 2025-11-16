/**
 * @file CreateFileModal.tsx
 * @summary ファイル作成モーダル（フラット構造版）
 * @description
 * パス指定なしでファイルを作成。カテゴリー・タグを直接入力。
 * CustomModalを活用してUI統一。
 * 既存カテゴリーのサジェスト機能付き。
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../../design/theme/ThemeContext';
import { CustomModal } from '../../../components/CustomModal';
import { CustomInlineInput } from '../../../components/CustomInlineInput';
import { FileRepository } from '../../../data/repositories/fileRepository';
import { FILE_LIST_FLAT_CONFIG } from '../config';
import { CreateFileModalProps } from '../types';

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
  const [existingCategories, setExistingCategories] = useState<string[]>([]);

  // 既存カテゴリーを取得
  useEffect(() => {
    if (visible) {
      FileRepository.getAllCategories()
        .then(setExistingCategories)
        .catch((error) => {
          console.error('Failed to load existing categories:', error);
          setExistingCategories([]);
        });
    }
  }, [visible]);

  // 入力されたカテゴリーパスを解析して、含まれるセグメントを抽出
  const getConsumedSegments = (): Set<string> => {
    if (!categoryText.trim()) {
      return new Set();
    }
    const segments = categoryText.split('/').map((s) => s.trim()).filter(Boolean);
    return new Set(segments);
  };

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

  // カテゴリーボタンをクリックした時の処理
  const handleCategoryButtonPress = (category: string) => {
    // カテゴリーを追加（既存パスに続ける or 新規）
    if (categoryText.trim() === '') {
      setCategoryText(category);
    } else {
      // 既に含まれているかチェック
      const currentSegments = categoryText.split('/').map((s) => s.trim()).filter(Boolean);
      const newSegments = category.split('/').map((s) => s.trim()).filter(Boolean);

      // すべてのセグメントが既に含まれている場合は何もしない
      const allIncluded = newSegments.every((seg) => currentSegments.includes(seg));
      if (allIncluded) {
        return;
      }

      // 末尾にスラッシュを追加してから新しいカテゴリーを追加
      const separator = categoryText.endsWith('/') ? '' : '/';
      setCategoryText(categoryText + separator + category);
    }
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
        <CustomInlineInput
          placeholder="ファイルタイトルを入力"
          value={title}
          onChangeText={setTitle}
          onClear={() => setTitle('')}
          autoFocus
          style={{ marginBottom: spacing.md }}
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
        <CustomInlineInput
          placeholder="例: 研究/AI/深層学習"
          value={categoryText}
          onChangeText={setCategoryText}
          onClear={() => setCategoryText('')}
          style={{ marginBottom: spacing.xs }}
        />

        {/* 既存のカテゴリー（サジェスト） */}
        {existingCategories.length > 0 && (
          <View style={{ marginBottom: spacing.md, marginLeft: spacing.md }}>
            <Text
              style={[
                styles.suggestLabel,
                { color: colors.textSecondary, marginBottom: spacing.xs },
              ]}
            >
              既存のカテゴリー
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              style={styles.categoryScrollView}
              contentContainerStyle={styles.categoryScrollContent}
            >
              {existingCategories.map((category, index) => {
                const consumedSegments = getConsumedSegments();
                const categorySegments = category.split('/').map((s) => s.trim()).filter(Boolean);

                // すべてのセグメントがconsumedされているかチェック
                const isConsumed = categorySegments.every((seg) => consumedSegments.has(seg));

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.categoryButton,
                      {
                        backgroundColor: isConsumed ? colors.tertiary : colors.secondary,
                        borderColor: isConsumed ? colors.tertiary : colors.border,
                      },
                    ]}
                    onPress={() => handleCategoryButtonPress(category)}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        { color: colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* タグ入力 */}
        <Text
          style={[
            styles.label,
            { color: colors.textSecondary, marginBottom: spacing.xs },
          ]}
        >
          タグ（カンマ区切り）
        </Text>
        <CustomInlineInput
          placeholder="例: 重要, TODO"
          value={tagsText}
          onChangeText={setTagsText}
          onClear={() => setTagsText('')}
        />
      </View>
    </CustomModal>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: FILE_LIST_FLAT_CONFIG.typography.heading,
    fontWeight: '500',
  },
  suggestLabel: {
    fontSize: FILE_LIST_FLAT_CONFIG.typography.caption,
    fontWeight: '500',
  },
  categoryScrollView: {
    maxHeight: FILE_LIST_FLAT_CONFIG.constraints.categoryScrollMaxHeight,
  },
  categoryScrollContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: FILE_LIST_FLAT_CONFIG.spacing.categoryButton.paddingHorizontal,
    paddingVertical: FILE_LIST_FLAT_CONFIG.spacing.categoryButton.paddingVertical,
    borderRadius: FILE_LIST_FLAT_CONFIG.borderRadius.categoryButton,
    borderWidth: 1,
    marginRight: FILE_LIST_FLAT_CONFIG.spacing.categoryButton.marginRight,
    marginBottom: FILE_LIST_FLAT_CONFIG.spacing.categoryButton.marginBottom,
    maxWidth: FILE_LIST_FLAT_CONFIG.constraints.categoryButtonMaxWidth,
  },
  categoryButtonText: {
    fontSize: FILE_LIST_FLAT_CONFIG.typography.caption,
    fontWeight: '500',
  },
});
