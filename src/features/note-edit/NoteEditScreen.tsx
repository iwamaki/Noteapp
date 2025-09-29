/**
 *  ノート編集画面
 *  ノートの内容を編集する画面です。
 */

import React, { useLayoutEffect, useState } from 'react';
import { View, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { FileEditor, ViewMode } from './components/FileEditor';
import { useNoteEditor } from './hooks/useNoteEditor';
import { useCustomHeader } from '../../components/CustomHeader';
import { commonStyles, colors, typography, responsive } from '../../utils/commonStyles';

type NoteEditScreenRouteProp = RouteProp<RootStackParamList, 'NoteEdit'>;

// NoteEditScreenコンポーネント
function NoteEditScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<NoteEditScreenRouteProp>();
  const { noteId } = route.params || {};
  const { createHeaderConfig } = useCustomHeader();

  // 新しいカスタムフックを使用してエディタのロジックを管理
  const {
    activeNote,
    title,
    setTitle,
    content,
    setContent,
    handleGoToDiff,
  } = useNoteEditor(noteId);

  const [viewMode, setViewMode] = useState<ViewMode>('edit'); 

  // ヘッダーのレイアウトエフェクトは残すが、フックから提供される状態を使用
  useLayoutEffect(() => {
    navigation.setOptions(
      createHeaderConfig({
        title: (
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={styles.headerTitle}
            placeholder="ノートのタイトル"
            placeholderTextColor={colors.textSecondary}
          />
        ),
        leftButtons: [
          {
            title: '戻る',
            onPress: () => navigation.goBack(),
            variant: 'secondary',
          },
        ],
        rightButtons: [
          {
            title: '保存',
            onPress: handleGoToDiff,
            variant: 'primary',
          },
          {
            title: '履歴',
            onPress: () => navigation.navigate('VersionHistory', { noteId: activeNote?.id || '' }),
            variant: 'secondary',
          },
        ],
      })
    );
  }, [navigation, title, activeNote, handleGoToDiff, createHeaderConfig]);

  // メインのレンダリング部分
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={commonStyles.container}
    >
      <FileEditor
        filename={title}
        initialContent={content}
        mode={viewMode}
        onModeChange={setViewMode}
        onSave={handleGoToDiff}
        onClose={() => navigation.goBack()}
        onContentChange={setContent}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    ...typography.title,
    color: colors.text,
    width: responsive.getResponsiveSize(180, 200, 220),
    textAlign: 'center',
  },
});

export default NoteEditScreen;