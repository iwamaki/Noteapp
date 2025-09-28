/**
 *  差分表示画面
 *  ノートの内容の差分を表示する画面です。
 */

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { DiffView } from './components/DiffView';
import { DiffUtils, DiffManager } from './utils/diffUtils';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { useNoteStore } from '../../store/noteStore';

// DiffViewScreenコンポーネント
function DiffViewScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { activeNote, draftNote, saveDraftNote, setDraftNote } = useNoteStore();
  const originalContent = activeNote?.content ?? '';
  const newContent = draftNote?.content ?? '';
  const filename = draftNote?.title ?? '差分プレビュー';

  // 差分の計算とDiffManagerの初期化
  const diff = useMemo(() => {
    const d = DiffUtils.generateDiff(originalContent, newContent);
    DiffManager.initializeDiff(d);
    return d;
  }, [originalContent, newContent]);

  // 選択されたブロックの状態管理
  const [selectedBlocks, setSelectedBlocks] = useState<Set<number>>(
    new Set(DiffManager.getSelectedBlocks())
  );

  // ブロック選択のトグル処理
  const handleBlockToggle = (blockId: number) => {
    DiffManager.toggleBlockSelection(blockId);
    setSelectedBlocks(new Set(DiffManager.getSelectedBlocks()));
  };

  // 全選択・全解除のトグル処理
  const handleAllToggle = () => {
    DiffManager.toggleAllSelection(diff);
    setSelectedBlocks(new Set(DiffManager.getSelectedBlocks()));
  };

  // 適用処理
  const handleApply = async () => {
    const selectedContent = DiffManager.generateSelectedContent(diff);
    if (selectedContent === null) {
      Alert.alert('エラー', '内容の生成に失敗しました');
      return;
    }

    // 差分表示から選択された内容でドラフトノートを更新
    setDraftNote({ title: filename, content: selectedContent });

    try {
      await saveDraftNote();
      Alert.alert('保存完了', 'ノートが保存されました。');
      navigation.goBack();  // 差分表示画面を閉じてノート編集画面に戻る
    } catch (error) {
      console.error(error);
      Alert.alert('エラー', 'ノートの保存に失敗しました。');
    }
  };

  // キャンセル処理
  const handleCancel = () => {
    setDraftNote(null);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <DiffView
        diff={diff}
        selectedBlocks={selectedBlocks}
        onBlockToggle={handleBlockToggle}
        onAllToggle={handleAllToggle}
        onApply={handleApply}
        onCancel={handleCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default DiffViewScreen;
