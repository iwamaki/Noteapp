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
import { generateDiff, validateDataConsistency } from '../../services/diffService';
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
    try {
      const selectedContent = generateSelectedContent();

      // デバッグ用ログ出力
      console.log('=== 保存時のデータ確認 ===');
      console.log('originalContent (元テキスト):');
      console.log(JSON.stringify(originalContent));
      console.log('newContent (編集後テキスト):');
      console.log(JSON.stringify(newContent));
      console.log('selectedContent (差分適用後テキスト):');
      console.log(JSON.stringify(selectedContent));
      console.log('originalContent.length:', originalContent.length);
      console.log('newContent.length:', newContent.length);
      console.log('selectedContent.length:', selectedContent.length);

      // 保存前の安全性チェック: 生成されたコンテンツが適切かを確認
      const tempDiff = generateDiff(originalContent, selectedContent);
      const validation = validateDataConsistency(originalContent, selectedContent, tempDiff);

      if (!validation.isValid) {
        console.log('=== 整合性エラー詳細 ===');
        console.log('validation.error:', validation.error);
        console.log('tempDiff:');
        console.log(JSON.stringify(tempDiff, null, 2));
        Alert.alert('データエラー', `保存データの整合性に問題があります: ${validation.error}`);
        return;
      }

      setDraftNote({ title: filename, content: selectedContent });
      await saveDraftNote();
      Alert.alert('保存完了', 'ノートが保存されました。');
      navigation.goBack();
    } catch (error) {
      console.error('保存エラー:', error);
      Alert.alert('エラー', 'ノートの保存に失敗しました。データの整合性を確認してください。');
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
