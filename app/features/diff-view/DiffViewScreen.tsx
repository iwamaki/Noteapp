/**
 * @file DiffViewScreen.tsx
 * @summary このファイルは、アプリケーションの差分表示画面をレンダリングします。
 * @responsibility ノートの変更履歴やドラフト内容の差分を表示し、選択した変更を適用またはバージョンを復元する機能を提供します。
 */
import React, { useMemo, useLayoutEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { useNoteStore, useNoteDraftStore } from '../../store/note';
import { generateDiff, validateDataConsistency } from '../../services/diffService';
import { NoteStorageService } from '../../services/storageService';
import { useDiffManager } from '../../hooks/useDiffManager';
import { DiffViewer } from './components/DiffViewer';
import { HeaderButton } from '../../components/HeaderButton';
import { logger } from '../../utils/logger'; // loggerをインポート

type DiffViewScreenNavigationProp = StackNavigationProp<RootStackParamList, 'DiffView'>;
type DiffViewScreenRouteProp = ReturnType<typeof useRoute<import('@react-navigation/native').RouteProp<RootStackParamList, 'DiffView'>>>;

function DiffViewScreen() {
  const navigation = useNavigation<DiffViewScreenNavigationProp>();
  const route = useRoute<DiffViewScreenRouteProp>();

  const activeNote = useNoteStore(state => state.activeNote);
  const selectNote = useNoteStore(state => state.selectNote);
  const draftNote = useNoteDraftStore(state => state.draftNote);
  const saveDraftNote = useNoteDraftStore(state => state.saveDraftNote);
  const setDraftNote = useNoteDraftStore(state => state.setDraftNote);

  const mode = route.params?.mode ?? 'save';
  
  const originalContent = useMemo(() => {
    if (route.params?.originalContent) {
      return route.params.originalContent;
    }
    return activeNote?.content ?? '';
  }, [route.params, activeNote]);

  const newContent = useMemo(() => {
    if (route.params?.newContent) {
      return route.params.newContent;
    }
    return draftNote?.content ?? '';
  }, [route.params, draftNote]);

  // デバッグ用ログ
  logger.debug('[DiffViewScreen] Content analysis:', {
    mode,
    hasRouteOriginal: !!route.params?.originalContent,
    hasRouteNew: !!route.params?.newContent,
    hasDraftNote: !!draftNote,
    originalLength: originalContent.length,
    newLength: newContent.length,
    originalPreview: originalContent.substring(0, 100),
    newPreview: newContent.substring(0, 100)
  });

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
    if (mode === 'restore') {
      const { noteId, versionId } = route.params ?? {};
      if (!noteId || !versionId) {
        Alert.alert('エラー', '復元に必要な情報が不足しています。');
        return;
      }
      try {
        const restoredNote = await NoteStorageService.restoreNoteVersion(noteId, versionId);
        await selectNote(restoredNote.id); // Update the store with the restored note
        Alert.alert('復元完了', 'ノートが指定されたバージョンに復元されました。');
        navigation.navigate('NoteEdit', { noteId: restoredNote.id, saved: true });
      } catch (error) {
        console.error('復元エラー:', error);
        Alert.alert('エラー', 'ノートの復元に失敗しました。');
      }
    } else { // 'save' mode
      try {
        const selectedContent = generateSelectedContent();
        const tempDiff = generateDiff(originalContent, selectedContent);
        const validation = validateDataConsistency(originalContent, selectedContent, tempDiff);

        if (!validation.isValid) {
          logger.debug('=== 整合性エラー詳細 ===');
          logger.debug('validation.error:', validation.error);
          Alert.alert('データエラー', `保存データの整合性に問題があります: ${validation.error}`);
          return;
        }

        setDraftNote({ title: filename, content: selectedContent });
        await saveDraftNote();
        Alert.alert('保存完了', 'ノートが保存されました。');
        navigation.goBack();
      } catch (error) {
        console.error('保存エラー:', error);
        Alert.alert('エラー', 'ノートの保存に失敗しました。');
      }
    }
  };

  const handleCancel = () => {
    if (mode === 'save') {
      setDraftNote(null);
    }
    navigation.goBack();
  };

  useLayoutEffect(() => {
    const isRestoreMode = mode === 'restore';
    navigation.setOptions({
      headerTitle: isRestoreMode ? 'Restore Version' : 'Apply Changes',
      headerLeft: () => (
        <HeaderButton
          title="←"
          onPress={handleCancel}
          variant="secondary"
        />
      ),
      headerRight: () => (
        <View style={styles.headerRightContainer}>
          {!isRestoreMode && (
            <HeaderButton
              title={allSelected ? '☑ 全選択' : '☐ 全選択'}
              onPress={toggleAllSelection}
              variant="secondary"
            />
          )}
          <HeaderButton
            title={isRestoreMode ? '復元' : `適用 (${selectedBlocks.size})`}
            onPress={handleApply}
            disabled={!isRestoreMode && selectedBlocks.size === 0}
            variant="primary"
          />
        </View>
      ),
    });
  }, [navigation, handleApply, handleCancel, toggleAllSelection, allSelected, selectedBlocks.size, mode]);

  return (
    <View style={styles.container}>
      <DiffViewer
        diff={diff}
        selectedBlocks={selectedBlocks}
        onBlockToggle={toggleBlockSelection}
        isReadOnly={mode === 'restore'} // In restore mode, diff is for viewing only
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