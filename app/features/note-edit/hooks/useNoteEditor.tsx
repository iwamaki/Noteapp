/**
 * @file useNoteEditor.ts
 * @summary このファイルは、ノート編集画面のロジックをカプセル化するカスタムフックを定義します。
 * @responsibility ノートの読み込み、タイトルとコンテンツの管理、変更の自動保存（デバウンス付き）、および差分表示画面への遷移ロジックを提供する責任があります。
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { Alert } from 'react-native';
import { RootStackParamList } from '../../../navigation/types';
import { NoteEditStorage } from '../noteStorage';
import { Note } from '@shared/types/note';

// カスタムフックの定義
export const useNoteEditor = (noteId: string | undefined) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNote = async () => {
      setIsLoading(true);
      if (noteId) {
        try {
          const fetchedNote = await NoteEditStorage.getNoteById(noteId);
          setNote(fetchedNote);
          setTitle(fetchedNote?.title ?? '');
          setContent(fetchedNote?.content ?? '');
        } catch (error) {
          console.error('Failed to fetch note:', error);
          Alert.alert('エラー', 'ノートの読み込みに失敗しました。');
          setNote(null);
          setTitle('');
          setContent('');
        } finally {
          setIsLoading(false);
        }
      } else {
        // 新規ノート作成の場合
        setNote(null);
        setTitle('');
        setContent('');
        setIsLoading(false);
      }
    };
    fetchNote();
  }, [noteId]);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
    }
  }, [note]);

  const handleSave = useCallback(async () => {
    if (note?.content === content && note?.title === title) {
      Alert.alert(
        '変更がありません',
        'ノートの内容に変更がありません。保存は必要ありません。',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      let savedNote: Note;
      if (note) {
        // 既存ノートの更新
        savedNote = await NoteEditStorage.updateNote({
          id: note.id,
          title,
          content,
          tags: note.tags,
        });
      } else {
        // 新規ノートの作成
        savedNote = await NoteEditStorage.createNote({
          title,
          content,
          tags: [],
        });
        // 新規作成後、URLを新しいnoteIdで置き換える
        navigation.replace('NoteEdit', { noteId: savedNote.id });
      }
      setNote(savedNote); // 保存されたノートで状態を更新
      Alert.alert('保存完了', 'ノートが保存されました。');
    } catch (error) {
      console.error('Failed to save note:', error);
      Alert.alert('エラー', 'ノートの保存に失敗しました。');
    }
  }, [note, title, content, navigation]);

  return {
    note,
    title,
    setTitle,
    content,
    setContent,
    isLoading,
    handleSave,
  };
};
