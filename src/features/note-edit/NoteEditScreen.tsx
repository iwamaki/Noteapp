/**
 *  ノート編集画面
 *  ノートの内容を編集する画面です。
 */

import React, { useLayoutEffect, useState } from 'react';
import { View, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { FileEditor, ViewMode } from './components/FileEditor';
import { useNoteEditor } from './hooks/useNoteEditor';
import { useCustomHeader } from '../../components/CustomHeader';
import { commonStyles, colors, typography, responsive } from '../../utils/commonStyles';
import { ChatInputBar } from '../chat/components/ChatInputBar';
import { ChatPanel } from '../chat/ChatPanel';
import { ChatContext } from '../../services/llmService';

type NoteEditScreenRouteProp = RouteProp<RootStackParamList, 'NoteEdit'>;

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
  const [isChatPanelVisible, setIsChatPanelVisible] = useState(false);

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
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={commonStyles.container}>
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
      <ChatInputBar onPress={() => setIsChatPanelVisible(true)} />
      {isChatPanelVisible && (
        <ChatPanel
          isVisible={isChatPanelVisible}
          onClose={() => setIsChatPanelVisible(false)}
          context={chatContext}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
