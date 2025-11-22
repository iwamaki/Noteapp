import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../navigation/types';
import { FileEditor, ViewMode as FileEditorViewMode } from './components/FileEditor';
import { useFileEditor } from './hooks/useFileEditor';
import { useFileEditHeader } from './hooks/useFileEditHeader';
import { useFileEditChatContext } from '../../features/chat/hooks/useFileEditChatContext';
import { CustomModal } from '../../components/CustomModal';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainContainer } from '../../components/MainContainer';
import { useTheme } from '../../design/theme/ThemeContext';

import type { ViewMode } from './types';
import { ToastMessage } from './components/ToastMessage'; // ToastMessageをインポート
import { useToastMessage } from './hooks/useToastMessage'; // useToastMessageをインポート
import { FeatureBar } from './components/FeatureBar'; // FeatureBarをインポート

type FileEditScreenRouteProp = RouteProp<RootStackParamList, 'FileEdit'>;

// ファイル編集画面コンポーネント
function FileEditScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const route = useRoute<FileEditScreenRouteProp>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { fileId, initialViewMode } = route.params || {};

  const {
    title,
    category,
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
      showToast(t('fileEdit.saved'), 2000);
    }
    prevIsSavingRef.current = isSaving;
  }, [isSaving, showToast, t]);

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
    viewMode,
    isLoading,
    isDirty,
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

  // スタイルをメモ化（テーマが変わったときのみ再作成）
  /* eslint-disable react-native/no-unused-styles */
  const styles = useMemo(
    () => StyleSheet.create({
      scrollView: {
        flex: 1,
        backgroundColor: colors.background,
      },
      contentContainer: {
        paddingHorizontal: 0,
        paddingVertical: 0,
        flexGrow: 1,
      },
    }),
    [colors.background]
  );
  /* eslint-enable react-native/no-unused-styles */

  return (
    <MainContainer isLoading={isLoading}>
      <ToastMessage {...toastProps} />
      <FeatureBar
        title={title}
        category={category}
        onTitleChange={handleTitleChange}
      />
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
        title={t('fileEdit.unsavedChanges.title')}
        message={t('fileEdit.unsavedChanges.message')}
        buttons={[
          {
            text: t('fileEdit.button.save'),
            style: 'default',
            onPress: async () => {
              setConfirmModalVisible(false);
              await handleSave();
              if (nextAction) {
                navigation.dispatch(nextAction);
              }
            },
          },
          {
            text: t('fileEdit.button.dontSave'),
            style: 'destructive',
            onPress: () => {
              setConfirmModalVisible(false);
              if (nextAction) {
                navigation.dispatch(nextAction);
              }
            },
          },
          {
            text: t('common.button.cancel'),
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
