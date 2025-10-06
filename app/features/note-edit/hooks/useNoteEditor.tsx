/**
 * @file useNoteEditor.ts
 * @summary このファイルは、ノート編集画面のロジックをカプセル化するカスタムフックを定義します。
 * @responsibility ノートの読み込み、タイトルとコンテンツの管理、変更の自動保存（デバウンス付き）、および差分表示画面への遷移ロジックを提供する責任があります。
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNoteStore } from '../../../store/note';
import { useNoteOperations } from '../../../hooks/useNoteOperations';
import { Alert } from 'react-native';
import { RootStackParamList } from '../../../navigation/types';

// カスタムフックの定義
export const useNoteEditor = (noteId: string | undefined) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const activeNote = useNoteStore(state => state.activeNote);
  const { selectNote, saveDraftNote } = useNoteOperations();

  const [title, setTitle] = useState(activeNote?.title ?? '');
  const [content, setContent] = useState(activeNote?.content ?? '');
  const [isLoading, setIsLoading] = useState(true);


  // noteIdに基づいてノートを選択し、ローディング状態を管理する
  useEffect(() => {
    setIsLoading(true);
    selectNote(noteId ?? null).finally(() => {
      // selectNoteが完了しても、activeNoteの更新は非同期なので、
      // ここではすぐにローディングを解除しない
    });
  }, [noteId, selectNote]);

  // activeNoteが更新されたら、タイトルを更新し、ローディングを解除する
  useEffect(() => {
    if (noteId === undefined || activeNote?.id === noteId) {
      setTitle(activeNote?.title ?? '');
      setIsLoading(false);
    }
  }, [activeNote, noteId]);

  // noteIdが変更されたら、コンテントを更新する
  useEffect(() => {
    if (noteId === undefined || activeNote?.id === noteId) {
      setContent(activeNote?.content ?? '');
    }
  }, [noteId]);



  // 差分表示画面への遷移ハンドラ
  const handleGoToDiff = useCallback(() => {
    navigation.navigate('DiffView', {
      mode: 'apply',
      originalContent: activeNote?.content ?? '',
      newContent: content,
      onApply: (newContent: string) => {
        setContent(newContent);
      },
    });
  }, [content, activeNote, navigation, setContent]);

  // 保存処理のハンドラ
  const handleSave = useCallback(() => {
    if (activeNote?.content === content) {
      Alert.alert(
        '変更がありません',
        'ノートの内容に変更がありません。保存は必要ありません。',
        [{ text: 'OK' }]
      );
      return;
    }
    saveDraftNote({ title, content }, activeNote?.id ?? null)
      .then(() => {
        Alert.alert('保存完了', 'ノートが保存されました。');
      })
      .catch(() => {
        Alert.alert('エラー', 'ノートの保存に失敗しました。');
      });
  }, [title, content, activeNote, saveDraftNote]);

  return {
    activeNote,
    title,
    setTitle,
    content,
    setContent,
    isLoading,
    handleGoToDiff,
    handleSave,
  };
};
