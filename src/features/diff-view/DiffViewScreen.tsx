import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { DiffView } from './components/DiffView';
import { DiffUtils, DiffManager } from './utils/diffUtils';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { useNoteStore } from '../../store/noteStore';

function DiffViewScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { activeNote, draftNote, saveDraftNote, setDraftNote } = useNoteStore();

  const originalContent = activeNote?.content ?? '';
  const newContent = draftNote?.content ?? '';
  const filename = draftNote?.title ?? '差分プレビュー';

  // useMemo to prevent re-calculating the diff on every render
  const diff = useMemo(() => {
    const d = DiffUtils.generateDiff(originalContent, newContent);
    DiffManager.initializeDiff(d);
    return d;
  }, [originalContent, newContent]);

  const [selectedBlocks, setSelectedBlocks] = useState<Set<number>>(
    new Set(DiffManager.getSelectedBlocks())
  );

  const handleBlockToggle = (blockId: number) => {
    DiffManager.toggleBlockSelection(blockId);
    setSelectedBlocks(new Set(DiffManager.getSelectedBlocks()));
  };

  const handleAllToggle = () => {
    DiffManager.toggleAllSelection(diff);
    setSelectedBlocks(new Set(DiffManager.getSelectedBlocks()));
  };

  const handleApply = async () => {
    const selectedContent = DiffManager.generateSelectedContent(diff);
    if (selectedContent === null) {
      Alert.alert('エラー', '内容の生成に失敗しました');
      return;
    }

    // Update the draftNote in the store with the content selected in the diff view
    setDraftNote({ title: filename, content: selectedContent });

    try {
                await saveDraftNote();
                Alert.alert('保存完了', 'ノートが保存されました。');
                // Go back to the NoteEdit screen
                navigation.goBack();
              } catch (error) {
                console.error(error);
                Alert.alert('エラー', 'ノートの保存に失敗しました。');
              }  };

  const handleCancel = () => {
    // Clear the draft note when cancelling
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
