/**
 *  差分表示画面 (コンテナ)
 *  ノートの差分表示機能を提供します。データの取得、ビジネスロジックの実行、
 *  およびUIコンポーネントへのデータ供給を担当します。
 */
import React, { useMemo } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { useNoteStore } from '../../store/noteStore';
import { generateDiff } from '../../services/diffService';
import { useDiffManager } from '../../hooks/useDiffManager';
import { DiffViewer } from './components/DiffViewer';

function DiffViewScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { activeNote, draftNote, saveDraftNote, setDraftNote } = useNoteStore();

  const originalContent = activeNote?.content ?? '';
  const newContent = draftNote?.content ?? '';
  const filename = draftNote?.title ?? '差分プレビュー';

  // 1. 差分データを計算 (from diffService)
  const diff = useMemo(() => generateDiff(originalContent, newContent), [
    originalContent,
    newContent,
  ]);

  // 2. 差分選択の状態を管理 (from useDiffManager hook)
  const {
    selectedBlocks,
    toggleBlockSelection,
    toggleAllSelection,
    generateSelectedContent,
    allChangeBlockIds,
  } = useDiffManager(diff);

  const allSelected = selectedBlocks.size === allChangeBlockIds.size && allChangeBlockIds.size > 0;

  // 3. ビジネスロジック (適用処理)
  const handleApply = async () => {
    const selectedContent = generateSelectedContent();
    setDraftNote({ title: filename, content: selectedContent });

    try {
      await saveDraftNote();
      Alert.alert('保存完了', 'ノートが保存されました。');
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('エラー', 'ノートの保存に失敗しました。');
    }
  };

  // 4. ビジネスロジック (キャンセル処理)
  const handleCancel = () => {
    setDraftNote(null);
    navigation.goBack();
  };

  // 5. UIコンポーネントにデータを渡してレンダリング
  return (
    <View style={styles.container}>
      <DiffViewer
        diff={diff}
        selectedBlocks={selectedBlocks}
        onBlockToggle={toggleBlockSelection}
      />
      <View style={styles.footer}>
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton} onPress={toggleAllSelection}>
            <Text style={styles.controlButtonText}>
              {allSelected ? '☑ All' : '☐ All'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlButton, styles.cancelButton]} onPress={handleCancel}>
            <Text style={styles.controlButtonText}>❌ キャンセル</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.controlButton,
              styles.applyButton,
              selectedBlocks.size === 0 && styles.disabledButton,
            ]}
            onPress={handleApply}
            disabled={selectedBlocks.size === 0}
          >
            <Text style={[styles.controlButtonText, styles.applyButtonText]}>
              ✅ 適用 ({selectedBlocks.size}件)
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  footer: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  controlButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
  },
  applyButton: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  applyButtonText: {
    color: '#fff',
  },
  disabledButton: {
    backgroundColor: '#6c757d',
    borderColor: '#6c757d',
    opacity: 0.5,
  },
});

export default DiffViewScreen;
