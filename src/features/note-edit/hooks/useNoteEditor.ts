/*
* ノートエディタの状態管理フック
* - noteIdに基づいてノートを選択し、エディタの状態を初期化
* - エディタの状態を管理（タイトル、内容）
* - 保存処理として差分表示画面への遷移を提供
*/

import { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/types';
import { useNoteStore } from '../../../store/noteStore';

export const useNoteEditor = (noteId: string | undefined) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { activeNote, selectNote, setDraftNote } = useNoteStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // 1. noteIdに基づいてノートを選択し、ローディング状態を管理する
  useEffect(() => {
    setIsLoading(true);
    selectNote(noteId ?? null).finally(() => {
      // selectNoteが完了しても、activeNoteの更新は非同期なので、
      // ここではすぐにローディングを解除しない
    });
  }, [noteId, selectNote]);

  // 2. activeNoteの変更を監視し、エディタの状態をセットする
  useEffect(() => {
    if (noteId) {
      // 既存ノートの場合
      if (activeNote && activeNote.id === noteId) {
        setTitle(activeNote.title);
        setContent(activeNote.content);
        setIsLoading(false);
      } else {
        // IDが一致しない場合（まだ新しいノートが読み込まれていない）
        setTitle('');
        setContent('');
        setIsLoading(true);
      }
    } else {
      // 新規ノートの場合
      setTitle('新しいノート');
      setContent('');
      setIsLoading(false);
    }
  }, [activeNote, noteId]);

  // 3. 保存処理（差分表示画面への遷移）のハンドラ
  const handleGoToDiff = useCallback(() => {
    setDraftNote({ title, content });
    navigation.navigate('DiffView');
  }, [title, content, setDraftNote, navigation]);

  return {
    activeNote,
    title,
    setTitle,
    content,
    setContent,
    isLoading,
    handleGoToDiff,
  };
};
