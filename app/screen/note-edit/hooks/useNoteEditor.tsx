/**
 * @file useNoteEditor.ts
 * @summary このファイルは、ノート編集画面のロジックをカプセル化するカスタムフックを定義します。
 * @responsibility ノートの読み込み、タイトルとコンテンツの管理、変更の自動保存（デバウンス付き）、および差分表示画面への遷移ロジックを提供する責任があります。
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { Alert } from 'react-native';
import { RootStackParamList } from '../../../navigation/types';
import { NoteEditStorage } from '../noteStorage';
import { Note } from '@shared/types/note';
import { useContentHistory } from './useContentHistory';

// カスタムフックの定義
export const useNoteEditor = (noteId: string | undefined) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const contentHistory = useContentHistory();

  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [isLoading, setIsLoading] = useState(true);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUndoRedoing = useRef<boolean>(false);

  const toggleWordWrap = useCallback(() => {
    setWordWrap((prev) => !prev);
  }, []);

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
      // ノートを読み込んだときに履歴をリセット
      contentHistory.reset(note.content);
      setCanUndo(false);
      setCanRedo(false);
    }
  }, [note]);

  // contentの変更を検知して履歴に追加（debounce付き）
  useEffect(() => {
    // Undo/Redo操作中は履歴を追加しない
    if (isUndoRedoing.current) {
      isUndoRedoing.current = false;
      return;
    }

    // デバウンス処理
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      contentHistory.pushHistory(content);
      setCanUndo(contentHistory.canUndo());
      setCanRedo(contentHistory.canRedo());
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [content]);

  // Undo関数
  const undo = useCallback(() => {
    const prevContent = contentHistory.undo();
    if (prevContent !== null) {
      isUndoRedoing.current = true;
      setContent(prevContent);
      setCanUndo(contentHistory.canUndo());
      setCanRedo(contentHistory.canRedo());
    }
  }, [contentHistory]);

  // Redo関数
  const redo = useCallback(() => {
    const nextContent = contentHistory.redo();
    if (nextContent !== null) {
      isUndoRedoing.current = true;
      setContent(nextContent);
      setCanUndo(contentHistory.canUndo());
      setCanRedo(contentHistory.canRedo());
    }
  }, [contentHistory]);

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

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
  }, []);

  useEffect(() => {
    if (isLoading) {
      // ロード中はダーティ状態にしない
      setIsDirty(false);
      return;
    }

    // 新規ノートの場合、noteはnull。初期値は空文字。
    const originalContent = note?.content ?? '';
    const originalTitle = note?.title ?? '';

    const hasChanges = title !== originalTitle || content !== originalContent;
    setIsDirty(hasChanges);
  }, [title, content, note, isLoading]);

  return {
    note,
    title,
    handleTitleChange,
    content,
    setContent,
    isLoading,
    handleSave,
    undo,
    redo,
    canUndo,
    canRedo,
    isDirty,
    wordWrap,
    toggleWordWrap,
  };
};
