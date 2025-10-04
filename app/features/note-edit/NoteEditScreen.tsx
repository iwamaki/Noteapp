/**
 * @file NoteEditScreen.tsx
 * @summary このファイルは、アプリケーションのノート編集画面をレンダリングします。
 * @responsibility ノートのタイトルと内容の編集、プレビュー表示、変更の保存、およびバージョン履歴へのアクセス機能を提供します。
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator, Keyboard, KeyboardEvent, Animated } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { FileEditor, ViewMode } from './components/FileEditor';
import { useNoteEditor } from './hooks/useNoteEditor';
import { useNoteEditHeader } from './hooks/useNoteEditHeader';
import { NoteEditHeader } from './components/NoteEditHeader';
import { useTheme } from '../../theme/ThemeContext';
import { ChatInputBar } from '../chat/ChatInputBar';
import { ChatContext, LLMCommand } from '../../services/llmService';
import { useLLMCommandHandler } from '../../hooks/useLLMCommandHandler';

type NoteEditScreenRouteProp = RouteProp<RootStackParamList, 'NoteEdit'>;

// 入力バーの高さ（概算）
const CHAT_INPUT_HEIGHT = Platform.OS === 'ios' ? 90 : 100;

// ノート編集画面コンポーネント
function NoteEditScreen() {
  const { colors } = useTheme();
  const route = useRoute<NoteEditScreenRouteProp>();
  const { noteId } = route.params || {};

  const {
    activeNote,
    title,
    setTitle,
    content,
    setContent,
    isLoading,
    handleGoToDiff,
    handleCompositionStart,
    handleCompositionEnd,
  } = useNoteEditor(noteId);

  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const paddingBottomAnim = useRef(new Animated.Value(CHAT_INPUT_HEIGHT)).current;

  // キーボードイベントのリスナー
  useEffect(() => {
    const keyboardWillShow = (e: KeyboardEvent) => {
      const height = e.endCoordinates.height;
      setKeyboardHeight(height);
      Animated.timing(paddingBottomAnim, {
        toValue: CHAT_INPUT_HEIGHT + height,
        duration: e.duration || 250,
        useNativeDriver: false,
      }).start();
    };

    const keyboardWillHide = (e: KeyboardEvent) => {
      setKeyboardHeight(0);
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

  // LLMコマンドハンドラの初期化
  const { handleLLMResponse } = useLLMCommandHandler({
    currentContent: content,
    setContent,
    title
  });

  // LLMコマンドを受信した時の処理
  const handleCommandReceived = (commands: LLMCommand[]) => {
    if (commands && commands.length > 0) {
      // コマンドハンドラに委譲
      handleLLMResponse({
        message: 'Commands received',
        commands
      });
    }
  };

  // ヘッダーの設定
  useNoteEditHeader({
    title,
    activeNoteId: activeNote?.id,
    viewMode,
    isLoading,
    headerTitle: (
      <NoteEditHeader
        title={title}
        onTitleChange={setTitle}
        editable={viewMode === 'edit' && !isLoading}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
      />
    ),
    onViewModeChange: setViewMode,
    onSave: handleGoToDiff,
  });

  // チャットエリアの作成
  const chatContext: ChatContext = {
    currentFile: activeNote?.id,
    currentFileContent: {
      filename: title,
      content: content,
      size: content.length.toString(),
      type: 'text',
    },
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
        onCommandReceived={handleCommandReceived}
      />
    </View>
  );
}

export default NoteEditScreen;
