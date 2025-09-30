/**
 *  ノート編集画面
 *  ノートの内容を編集する画面です。
 */

import React, { useLayoutEffect, useState } from 'react';
import { View, StyleSheet, TextInput, Platform, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { FileEditor, ViewMode } from './components/FileEditor';
import { useNoteEditor } from './hooks/useNoteEditor';
import { useCustomHeader } from '../../components/CustomHeader';
import { commonStyles, colors, typography, responsive, spacing } from '../../utils/commonStyles';
import { ChatInputBar } from '../chat/components/ChatInputBar';
import { ChatContext } from '../../services/llmService';

type NoteEditScreenRouteProp = RouteProp<RootStackParamList, 'NoteEdit'>;

// 入力バーの高さ（概算）
const CHAT_INPUT_HEIGHT = Platform.OS === 'ios' ? 78 : 66;

function NoteEditScreen() {
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

  const chatContext: ChatContext = {
    currentFile: activeNote?.id,
    currentFileContent: {
      filename: title,
      content: content,
      size: content.length.toString(),
      type: 'text',
    },
  };

  return (
    <View style={commonStyles.container}>
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
      <ChatInputBar context={chatContext} />
    </View>
  );
}

const styles = StyleSheet.create({
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

export default NoteEditScreen;
