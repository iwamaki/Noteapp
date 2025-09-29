import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNoteStore } from '../../../store/noteStore';
import { Alert } from 'react-native';
import { RootStackParamList } from '../../../navigation/types';

export const useNoteEditor = (noteId: string | undefined) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { activeNote, selectNote, setDraftNote, updateNote } = useNoteStore();

  const [title, setTitle] = useState(activeNote?.title ?? '');
  const [content, setContent] = useState(activeNote?.content ?? '');
  const [isLoading, setIsLoading] = useState(true);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // 1. noteIdに基づいてノートを選択し、ローディング状態を管理する
  useEffect(() => {
    setIsLoading(true);
    selectNote(noteId ?? null).finally(() => {
      // selectNoteが完了しても、activeNoteの更新は非同期なので、
      // ここではすぐにローディングを解除しない
    });
  }, [noteId, selectNote]);

  // 2. activeNoteが更新されたら、ローカルのstateを更新し、ローディングを解除する
  useEffect(() => {
    if (noteId === undefined || activeNote?.id === noteId) {
      setTitle(activeNote?.title ?? '');
      setContent(activeNote?.content ?? '');
      setIsLoading(false);
    }
  }, [activeNote, noteId]);

  // タイトル変更ハンドラ（デバウンス付き自動保存）
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle); // UI即時反映

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      if (activeNote && activeNote.title !== newTitle) {
        updateNote({ id: activeNote.id, title: newTitle })
          .catch(error => {
            console.error('Failed to update title:', error);
            Alert.alert('エラー', 'タイトルの更新に失敗しました。');
            // エラーが発生した場合、UIを元のタイトルに戻す
            setTitle(activeNote.title);
          });
      }
    }, 500); // 500msのデバウンス
  };

  // 3. 保存処理（差分表示画面への遷移）のハンドラ
  const handleGoToDiff = useCallback(() => {
    // コンテンツが変更されていない場合はアラートを表示して遷移しない
    if (activeNote?.content === content) {
      Alert.alert(
        '変更がありません',
        'ノートの内容に変更がありません。保存は必要ありません。',
        [{ text: 'OK' }]
      );
      return;
    }
    setDraftNote({ title, content });
    navigation.navigate('DiffView');
  }, [title, content, activeNote, setDraftNote, navigation]);

  return {
    activeNote,
    title,
    setTitle: handleTitleChange, // NoteEditScreenに渡す関数を新しいハンドラに
    content,
    setContent,
    isLoading,
    handleGoToDiff,
  };
};
