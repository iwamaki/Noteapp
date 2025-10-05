/**
 * @file useNoteEditor.ts
 * @summary このファイルは、ノート編集画面のロジックをカプセル化するカスタムフックを定義します。
 * @responsibility ノートの読み込み、タイトルとコンテンツの管理、変更の自動保存（デバウンス付き）、および差分表示画面への遷移ロジックを提供する責任があります。
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNoteStore, useNoteDraftStore } from '../../../store/note';
import { Alert } from 'react-native';
import { RootStackParamList } from '../../../navigation/types';

// カスタムフックの定義
export const useNoteEditor = (noteId: string | undefined) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const activeNote = useNoteStore(state => state.activeNote);
  const selectNote = useNoteStore(state => state.selectNote);
  const updateNote = useNoteStore(state => state.updateNote);
  const setDraftNote = useNoteDraftStore(state => state.setDraftNote);

  const [title, setTitle] = useState(activeNote?.title ?? '');
  const [content, setContent] = useState(activeNote?.content ?? '');
  const [isLoading, setIsLoading] = useState(true);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  // IME入力中かどうかを追跡するフラグ
  const isComposing = useRef(false);

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

  // タイトル変更ハンドラ（デバウンス付き自動保存）
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle); // UI即時反映

    // IME入力中は自動保存をスキップ
    if (isComposing.current) {
      return;
    }

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
    }, 1000); // デバウンス時間を1000msに延長してIME入力の余裕を持たせる
  };

  // IME入力開始時のハンドラ
  const handleCompositionStart = () => {
    isComposing.current = true;
    // デバウンスタイマーをクリアして、IME入力中は保存しない
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  };

  // IME入力終了時のハンドラ（変換確定時）
  const handleCompositionEnd = (finalTitle: string) => {
    isComposing.current = false;
    // 変換確定後に保存処理を実行
    if (activeNote && activeNote.title !== finalTitle) {
      // 少し遅延させて確実に変換が確定した後に保存
      setTimeout(() => {
        updateNote({ id: activeNote.id, title: finalTitle })
          .catch(error => {
            console.error('Failed to update title:', error);
            Alert.alert('エラー', 'タイトルの更新に失敗しました。');
            setTitle(activeNote.title);
          });
      }, 100);
    }
  };

  // 保存処理（差分表示画面への遷移）のハンドラ
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
    setTitle: handleTitleChange,
    content,
    setContent,
    isLoading,
    handleGoToDiff,
    handleCompositionStart,
    handleCompositionEnd,
  };
};
