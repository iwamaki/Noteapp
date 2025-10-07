/**
 * @file useNoteEditor.ts
 * @summary このファイルは、ノート編集画面のロジックをカプセル化するカスタムフックを定義します。
 * @responsibility ノートの読み込み、タイトルとコンテンツの管理、変更の自動保存（デバウンス付き）、および差分表示画面への遷移ロジックを提供する責任があります。
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNoteStore } from '../../../store/note';
import { noteService } from '../../../services/NoteService'; // noteServiceをインポート
import { Alert } from 'react-native';
import { RootStackParamList } from '../../../navigation/types';

// カスタムフックの定義
export const useNoteEditor = (noteId: string | undefined) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const activeNote = useNoteStore(state => state.activeNote);

  const [title, setTitle] = useState(activeNote?.title ?? '');
  const [content, setContent] = useState(activeNote?.content ?? '');
  const [isLoading, setIsLoading] = useState(true);


  // noteIdに基づいてノートを選択し、ローディング状態を管理する
  useEffect(() => {
    setIsLoading(true);
    noteService.selectNote(noteId ?? null).finally(() => {
      // selectNoteが完了しても、activeNoteの更新は非同期なので、
      // ここではすぐにローディングを解除しない
    });
  }, [noteId]);

  // activeNoteが更新されたら、タイトルとコンテンツを更新し、ローディングを解除する
  useEffect(() => {
    console.log('[DEBUG] useNoteEditor activeNote effect. noteId:', noteId, 'activeNote:', activeNote?.id);
    if (noteId === undefined) {
      // 新規ノート作成の場合
      console.log('[DEBUG] useNoteEditor: New note case');
      setTitle(activeNote?.title ?? '');
      setContent(activeNote?.content ?? '');
      setIsLoading(false);
    } else if (activeNote?.id === noteId) {
      // 既存ノートが正しく読み込まれた場合
      console.log('[DEBUG] useNoteEditor: Existing note loaded');
      setTitle(activeNote.title);
      setContent(activeNote.content);
      setIsLoading(false);
    } else {
      console.log('[DEBUG] useNoteEditor: Loading continues');
    }
    // activeNoteがnullまたは異なるIDの場合は何もしない（ローディング継続）
  }, [activeNote, noteId]);




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
    noteService.saveDraftNote({ title, content, tags: activeNote?.tags ?? [] }, activeNote?.id ?? null)
      .then(() => {
        Alert.alert('保存完了', 'ノートが保存されました。');
      })
      .catch(() => {
        Alert.alert('エラー', 'ノートの保存に失敗しました。');
      });
  }, [title, content, activeNote]);

  return {
    activeNote,
    title,
    setTitle,
    content,
    setContent,
    isLoading,
    handleSave,
  };
};
