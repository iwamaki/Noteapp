/**
 * @file NoteEditScreen.tsx
 * @summary このファイルは、アプリケーションのノート編集画面をレンダリングします。
 * @responsibility ノートのタイトルと内容の編集、プレビュー表示、変更の保存、およびバージョン履歴へのアクセス機能を提供します。
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator, Keyboard, Animated } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { FileEditor, ViewMode } from './components/FileEditor';
import { useNoteEditor } from './hooks/useNoteEditor';
import { useNoteEditHeader } from './hooks/useNoteEditHeader';
import { useTheme } from '../../design/theme/ThemeContext';
import { ChatInputBar } from '../../features/chat/ChatInputBar';
import { ChatContext } from '../../services/llmService/types';

type NoteEditScreenRouteProp = RouteProp<RootStackParamList, 'NoteEdit'>;

// 入力バーの高さ（概算）
const CHAT_INPUT_HEIGHT = Platform.OS === 'ios' ? 90 : 100;

// ノート編集画面コンポーネント
function NoteEditScreen() {
  const { colors } = useTheme();
  const route = useRoute<NoteEditScreenRouteProp>();
  const { noteId } = route.params || {};

  const {
    note,
    title,
    content,
    setContent,
    isLoading,
    handleSave,
    handleTitleChange,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useNoteEditor(noteId);

  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const paddingBottomAnim = useRef(new Animated.Value(CHAT_INPUT_HEIGHT)).current;

  // キーボードイベントのリスナー
  useEffect(() => {
    const keyboardWillShow = (e: any) => {
      const height = e.endCoordinates.height;
      Animated.timing(paddingBottomAnim, {
        toValue: CHAT_INPUT_HEIGHT + height,
        duration: e.duration || 250,
        useNativeDriver: false,
      }).start();
    };

    const keyboardWillHide = (e: any) => {
      Animated.timing(paddingBottomAnim, {
        toValue: CHAT_INPUT_HEIGHT,
        duration: e.duration || 250,
        useNativeDriver: false,
      }).start();
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, keyboardWillShow);
    const hideSubscription = Keyboard.addListener(hideEvent, keyboardWillHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [paddingBottomAnim]);


  // ヘッダーの設定
  useNoteEditHeader({
    title,
    activeNoteId: note?.id,
    viewMode,
    isLoading,
    isEditable: viewMode === 'edit' && !isLoading,
    onTitleChange: handleTitleChange,
    onViewModeChange: setViewMode,
    onSave: handleSave,
    onUndo: undo,
    onRedo: redo,
    canUndo,
    canRedo,
  });

  // チャットエリアの作成
  const chatContext: ChatContext = {
    currentFile: note?.id,
  };

  // スタイルの定義
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.contentContainer, { paddingBottom: paddingBottomAnim }]}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FileEditor
            filename={title}
            initialContent={content}
            mode={viewMode}
            onModeChange={setViewMode}
            onContentChange={setContent}
          />
        )}
      </Animated.View>
      <ChatInputBar
        context={chatContext}
        onCommandReceived={() => {}}
        currentNoteTitle={title}
        currentNoteContent={content}
      />
    </View>
  );
}

export default NoteEditScreen;
