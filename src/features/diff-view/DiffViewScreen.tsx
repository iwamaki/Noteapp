/**
 *  差分表示画面 (コンテナ)
 *  ノートの差分表示機能を提供します。データの取得、ビジネスロジックの実行、
 *  およびUIコンポーネントへのデータ供給を担当します。
 */
import React, { useMemo, useLayoutEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { useNoteStore } from '../../store/noteStore';
import { generateDiff } from '../../services/diffService';
import { useDiffManager } from '../../hooks/useDiffManager';
import { DiffViewer } from './components/DiffViewer';
import { HeaderButton } from '../../components/HeaderButton';

function DiffViewScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { activeNote, draftNote, saveDraftNote, setDraftNote } = useNoteStore();

  const originalContent = activeNote?.content ?? '';
  const newContent = draftNote?.content ?? '';
  const filename = draftNote?.title ?? '差分プレビュー';

  const diff = useMemo(() => generateDiff(originalContent, newContent), [
    originalContent,
    newContent,
  ]);

  const {
    selectedBlocks,
    toggleBlockSelection,
    toggleAllSelection,
    generateSelectedContent,
    allChangeBlockIds,
  } = useDiffManager(diff);

  const allSelected = selectedBlocks.size === allChangeBlockIds.size && allChangeBlockIds.size > 0;

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

  const handleCancel = () => {
    setDraftNote(null);
    navigation.goBack();
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'DiffView',
      headerLeft: () => (
        <HeaderButton
          title="←"
          onPress={handleCancel}
          variant="secondary"
        />
      ),
      headerRight: () => (
        <View style={styles.headerRightContainer}>
          <HeaderButton
            title={allSelected ? '☑ 全選択' : '☐ 全選択'}
            onPress={toggleAllSelection}
            variant="secondary"
          />
          <HeaderButton
            title={`適用 (${selectedBlocks.size})`}
            onPress={handleApply}
            disabled={selectedBlocks.size === 0}
            variant="primary"
          />
        </View>
      ),
    });
  }, [navigation, handleApply, handleCancel, toggleAllSelection, allSelected, selectedBlocks.size]);

  return (
    <View style={styles.container}>
      <DiffViewer
        diff={diff}
        selectedBlocks={selectedBlocks}
        onBlockToggle={toggleBlockSelection}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default DiffViewScreen;
