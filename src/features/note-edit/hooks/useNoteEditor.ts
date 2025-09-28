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

  // 1. noteIdに基づいてノートを選択する
  useEffect(() => {
    if (noteId) {
      selectNote(noteId);
    } else {
      // 新規ノートの場合はアクティブなノートをクリア
      selectNote(null);
    }
  }, [noteId, selectNote]);

  // 2. activeNoteからエディタの状態をセットする
  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title);
      setContent(activeNote.content);
    } else {
      // 新規ノートのデフォルト値
      setTitle('新しいノート');
      setContent('');
    }
  }, [activeNote]);

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
    handleGoToDiff,
  };
};
