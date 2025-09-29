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
    const rightButtons: Array<{
      title: string;
      onPress: () => void;
      variant?: 'primary' | 'secondary' | 'danger';
    }> = [];



    if (viewMode === 'content') {
      rightButtons.push({
        title: '編集',
        onPress: () => setViewMode('edit'),
        variant: 'primary',
      });
    } else if (viewMode === 'edit') {
      rightButtons.push({
        title: 'プレビュー',
        onPress: () => setViewMode('preview'),
        variant: 'secondary',
      });
      rightButtons.push({
        title: '保存',
        onPress: handleGoToDiff, // NoteEditScreenの保存ロジック
        variant: 'primary',
      });
    } else if (viewMode === 'preview') {
      rightButtons.push({
        title: '編集に戻る',
        onPress: () => setViewMode('edit'),
        variant: 'secondary',
      });
    } else if (viewMode === 'diff') {
      // diffモードでは、FileEditorのフッターにボタンがあるため、ヘッダーには表示しない
      // 必要であれば、ここにdiffモード用のボタンを追加することも可能
    }

    // 履歴ボタンは常に表示
    rightButtons.push({
      title: '履歴',
      onPress: () => navigation.navigate('VersionHistory', { noteId: activeNote?.id || '' }),
      variant: 'secondary',
    });

    navigation.setOptions(
      createHeaderConfig({
        title: (
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={styles.headerTitle}
            placeholder="ノートのタイトル"
            placeholderTextColor={colors.textSecondary}
            editable={viewMode === 'edit'}
          />
        ),
        leftButtons: [
          {
            title: '\u2190',
            onPress: () => navigation.goBack(),
            variant: 'secondary',
          },
        ],
        rightButtons: rightButtons, // 動的に生成したrightButtonsをセット
      })
    );
  }, [navigation, title, activeNote, handleGoToDiff, createHeaderConfig, viewMode, setViewMode]);

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
    textAlign: 'left',
  },
});

export default NoteEditScreen;