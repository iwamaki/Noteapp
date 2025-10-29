import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { FileEditor, ViewMode as FileEditorViewMode } from './components/FileEditor';
import { useFileEditor } from './hooks/useFileEditor';
import { useFileEditHeader } from './hooks/useFileEditHeader';
import { useFileEditChatContext } from '../../features/chat/hooks/useFileEditChatContext';
import { CustomModal } from '../../components/CustomModal';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainContainer } from '../../components/MainContainer';
import { useKeyboardHeight } from '../../contexts/KeyboardHeightContext';
import { useTheme } from '../../design/theme/ThemeContext';

import type { ViewMode } from './types';
import { ToastMessage } from './components/ToastMessage'; // ToastMessageをインポート
import { useToastMessage } from './hooks/useToastMessage'; // useToastMessageをインポート

type FileEditScreenRouteProp = RouteProp<RootStackParamList, 'FileEdit'>;

// ファイル編集画面コンポーネント
function FileEditScreen() {
  const { colors } = useTheme();
  const route = useRoute<FileEditScreenRouteProp>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { fileId, initialViewMode } = route.params || {};
  const { keyboardHeight, chatInputBarHeight } = useKeyboardHeight();

  const {
    file,
    title,
    content,
    setContent,
    isLoading,
    isSaving,
    save: handleSave,
    setTitle: handleTitleChange,
    undo,
    redo,
    canUndo,
    canRedo,
    isDirty,
    viewMode,
    setViewMode,
  } = useFileEditor(fileId, initialViewMode);

  const [isConfirmModalVisible, setConfirmModalVisible] = useState(false);
  const [nextAction, setNextAction] = useState<any>(null);
  const { showToast, toastProps } = useToastMessage();

  const prevIsSavingRef = useRef(isSaving);

  useEffect(() => {
    if (prevIsSavingRef.current === true && isSaving === false) {
      showToast('保存しました！', 2000);
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

  useFileEditHeader({
    title,
    activeFileId: file?.id,
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
  });

  useFileEditChatContext({
    title,
    content,
    path: '', // V2型にはpathフィールドがない
    setContent,
  });

  const mapViewModeToFileEditor = (mode: ViewMode): FileEditorViewMode => {
    if (mode === 'diff') return 'preview';
    return mode as FileEditorViewMode;
  };

  const handleViewModeChange = (mode: FileEditorViewMode) => {
    setViewMode(mode as ViewMode);
  };

  const chatBarOffset = chatInputBarHeight + keyboardHeight;

  // スタイルをメモ化（テーマとchatBarOffsetが変わったときのみ再作成）
  const styles = useMemo(
    () => StyleSheet.create({
      scrollView: {
        flex: 1,
        backgroundColor: colors.secondary,
      },
      contentContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingBottom: chatBarOffset,
        flexGrow: 1,
      },
    }),
    [colors.secondary, chatBarOffset]
  );

  return (
    <MainContainer isLoading={isLoading}>
      <ToastMessage {...toastProps} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        showsHorizontalScrollIndicator={false}
      >
        <FileEditor
          filename={title}
          initialContent={content}
          mode={mapViewModeToFileEditor(viewMode)}
          onModeChange={handleViewModeChange}
          onContentChange={setContent}
        />
      </ScrollView>
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
              handleSave();
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
          setNextAction(null);
        }}
      />
    </MainContainer>
  );
}

export default FileEditScreen;
