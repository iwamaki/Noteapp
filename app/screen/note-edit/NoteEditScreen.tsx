import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { FileEditor, ViewMode as FileEditorViewMode } from './components/FileEditor';
import { useNoteEditor } from './hooks/useNoteEditor';
import { useNoteEditHeader } from './hooks/useNoteEditHeader';
import { useNoteEditChatContext } from '../../features/chat/hooks/useNoteEditChatContext';
import { CustomModal } from '../../components/CustomModal';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainContainer } from '../../components/MainContainer';
import { useKeyboardHeight } from '../../contexts/KeyboardHeightContext';

import type { ViewMode } from './types';
import { ToastMessage } from './components/ToastMessage'; // ToastMessageをインポート
import { useToastMessage } from './hooks/useToastMessage'; // useToastMessageをインポート

type NoteEditScreenRouteProp = RouteProp<RootStackParamList, 'NoteEdit'>;

// 静的スタイル（コンポーネント外部で定義）
const staticStyles = StyleSheet.create({
  animatedContainer: {
    flex: 1,
  },
});

// ノート編集画面コンポーネント
function NoteEditScreen() {
  const route = useRoute<NoteEditScreenRouteProp>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { noteId } = route.params || {};
  const { keyboardHeight, chatInputBarHeight } = useKeyboardHeight();


  const {
    note,
    title,
    content,
    setContent,
    isLoading,
    isSaving, // isSavingを取得
    save: handleSave,
    setTitle: handleTitleChange,
    undo,
    redo,
    canUndo,
    canRedo,
    isDirty,
    wordWrap,
    toggleWordWrap,
    viewMode,
    setViewMode,
  } = useNoteEditor(noteId);

  const [isConfirmModalVisible, setConfirmModalVisible] = useState(false);
  const [nextAction, setNextAction] = useState<any>(null);
  const { showToast, toastProps } = useToastMessage(); // useToastMessageフックを呼び出す

  const prevIsSavingRef = useRef(isSaving);

  // 保存状態に応じてトーストメッセージを表示
  useEffect(() => {
    // isSavingがtrueからfalseに変わったときに「保存しました！」を表示
    if (prevIsSavingRef.current === true && isSaving === false) {
      showToast('保存しました！', 2000); // 2秒後に自動的に非表示
    }
    prevIsSavingRef.current = isSaving;
  }, [isSaving, showToast]);

  useEffect(() => {
    const beforeRemoveListener = (e: any) => {
      if (!isDirty || isLoading) {
        return;
      }
      e.preventDefault();
      setNextAction(e.data.action);
      setConfirmModalVisible(true);
    };

    navigation.addListener('beforeRemove', beforeRemoveListener);

    return () => {
      navigation.removeListener('beforeRemove', beforeRemoveListener);
    };
  }, [navigation, isDirty, isLoading]);

  // ヘッダーの設定
  useNoteEditHeader({
    title,
    activeNoteId: note?.id,
    viewMode,
    isLoading,
    isEditable: viewMode === 'edit' && !isLoading,
    isDirty,
    onTitleChange: handleTitleChange,
    onViewModeChange: setViewMode,
    onSave: handleSave,
    onUndo: undo,
    onRedo: redo,
    canUndo,
    canRedo,
    isWordWrapEnabled: wordWrap,
    onToggleWordWrap: toggleWordWrap,
    originalNoteContent: note?.content ?? '',
    currentContent: content,
  });

  // チャットコンテキストプロバイダーを登録
  useNoteEditChatContext({
    title,
    content,
    setContent,
  });

  // ViewModeの変換（新アーキテクチャの型 → FileEditorの型）
  const mapViewModeToFileEditor = (mode: ViewMode): FileEditorViewMode => {
    // 'diff'は現時点でFileEditorでサポートされていないため、'preview'にフォールバック
    if (mode === 'diff') return 'preview';
    return mode as FileEditorViewMode;
  };

  // FileEditorのViewMode変更を新アーキテクチャのViewModeに変換
  const handleViewModeChange = (mode: FileEditorViewMode) => {
    setViewMode(mode as ViewMode);
  };

  // キーボード + ChatInputBarの高さを計算してコンテンツが隠れないようにする
  const chatBarOffset = chatInputBarHeight + keyboardHeight;

  // キーボードオフセット依存スタイル（メモ化）
  const contentPaddingStyle = useMemo(() => ({
    paddingBottom: chatBarOffset,
  }), [chatBarOffset]);

  return (
    <MainContainer isLoading={isLoading}>
      <ToastMessage {...toastProps} />
      <View style={[staticStyles.animatedContainer, contentPaddingStyle]}>
        <FileEditor
          filename={title}
          initialContent={content}
          mode={mapViewModeToFileEditor(viewMode)}
          onModeChange={handleViewModeChange}
          onContentChange={setContent}
          wordWrap={wordWrap}
        />
      </View>
      <CustomModal
        isVisible={isConfirmModalVisible}
        title="未保存の変更があります。"
        message="保存しますか？"
        buttons={[
          {
            text: '保存する',
            style: 'default',
            onPress: () => {
              setConfirmModalVisible(false);
              handleSave(); // 変更を保存
              if (nextAction) {
                navigation.dispatch(nextAction);
              }
            },
          },
          {
            text: '保存しない',
            style: 'destructive',
            onPress: () => {
              setConfirmModalVisible(false);
              if (nextAction) {
                navigation.dispatch(nextAction);
              }
            },
          },
          {
            text: 'キャンセル',
            style: 'cancel',
            onPress: () => setConfirmModalVisible(false),
          },
        ]}
        onClose={() => {
          setConfirmModalVisible(false);
          setNextAction(null); // アクションをクリア
        }}
      />
    </MainContainer>
  );
}

export default NoteEditScreen;
