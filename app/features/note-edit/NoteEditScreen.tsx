/**
 * @file NoteEditScreen.tsx
 * @summary このファイルは、アプリケーションのノート編集画面をレンダリングします。
 * @responsibility ノートのタイトルと内容の編集、プレビュー表示、変更の保存、およびバージョン履歴へのアクセス機能を提供します。
 */

import React, { useLayoutEffect, useState } from 'react';
import { View, StyleSheet, TextInput, Platform, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { FileEditor, ViewMode } from './components/FileEditor';
import { useNoteEditor } from './hooks/useNoteEditor';
import { useCustomHeader } from '../../components/CustomHeader';
import { responsive } from '../../utils/commonStyles';
import { useTheme } from '../../theme/ThemeContext';
import { ChatInputBar } from '../chat/ChatInputBar';
import { ChatContext, LLMCommand } from '../../services/llmService';
import { useLLMCommandHandler } from '../../hooks/useLLMCommandHandler';

type NoteEditScreenRouteProp = RouteProp<RootStackParamList, 'NoteEdit'>;

// 入力バーの高さ（概算）
const CHAT_INPUT_HEIGHT = Platform.OS === 'ios' ? 78 : 66;

// ノート編集画面コンポーネント
function NoteEditScreen() {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<NoteEditScreenRouteProp>();
  const { noteId } = route.params || {};
  const { createHeaderConfig } = useCustomHeader();

  const {
    activeNote,
    title,
    setTitle,
    content,
    setContent,
    isLoading,
    handleGoToDiff,
  } = useNoteEditor(noteId);

  const [viewMode, setViewMode] = useState<ViewMode>('edit');

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
  useLayoutEffect(() => {
    const rightButtons: Array<{ title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger'; }> = [];

    if (!isLoading) {
      if (viewMode === 'content') {
        rightButtons.push({ title: '編集', onPress: () => setViewMode('edit'), variant: 'primary' });
      } else if (viewMode === 'edit') {
        rightButtons.push({ title: 'プレビュー', onPress: () => setViewMode('preview'), variant: 'secondary' });
        rightButtons.push({ title: '保存', onPress: handleGoToDiff, variant: 'primary' });
      } else if (viewMode === 'preview') {
        rightButtons.push({ title: '編集に戻る', onPress: () => setViewMode('edit'), variant: 'secondary' });
      }
      rightButtons.push({ title: '履歴', onPress: () => navigation.navigate('VersionHistory', { noteId: activeNote?.id || '' }), variant: 'secondary' });
    }

    // タイトル入力欄をヘッダーに表示
    navigation.setOptions(
      createHeaderConfig({
        title: (
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={styles.headerTitle}
            placeholder="ノートのタイトル"
            placeholderTextColor={colors.textSecondary}
            editable={viewMode === 'edit' && !isLoading}
          />
        ),
        leftButtons: [{ title: '\u2190', onPress: () => navigation.goBack(), variant: 'secondary' }],
        rightButtons: rightButtons,
      })
    );
  }, [navigation, title, activeNote, handleGoToDiff, createHeaderConfig, viewMode, setViewMode, isLoading]);

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
    headerTitle: {
      ...typography.title,
      color: colors.text,
      width: responsive.getResponsiveSize(180, 200, 220),
      textAlign: 'left',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <View style={[styles.contentContainer, { paddingBottom: CHAT_INPUT_HEIGHT }]}>
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
      </View>
      <ChatInputBar
        context={chatContext}
        onCommandReceived={handleCommandReceived}
      />
    </View>
  );
}

export default NoteEditScreen;
