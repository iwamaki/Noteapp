import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { FileEditor, ViewMode } from './components/FileEditor';
import { useNoteEditor } from './hooks/useNoteEditor';
import { useNoteEditHeader } from './hooks/useNoteEditHeader';
import { useNoteEditChatContext } from '../../features/chat/hooks/useNoteEditChatContext';
import { CustomModal } from '../../components/CustomModal';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainContainer } from '../../components/MainContainer';
import { useKeyboard } from '../../contexts/KeyboardContext';
import { CHAT_INPUT_HEIGHT } from '../../design/constants';

type NoteEditScreenRouteProp = RouteProp<RootStackParamList, 'NoteEdit'>;

// ノート編集画面コンポーネント
function NoteEditScreen() {
  const route = useRoute<NoteEditScreenRouteProp>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { noteId } = route.params || {};
  const { keyboardHeight } = useKeyboard();

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
    isDirty,
  } = useNoteEditor(noteId);

  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [isConfirmModalVisible, setConfirmModalVisible] = useState(false);
  const [nextAction, setNextAction] = useState<any>(null); 

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
  });

  // チャットコンテキストプロバイダーを登録
  useNoteEditChatContext({
    title,
    content,
    setContent,
  });

  const styles = StyleSheet.create({
    animatedContainer: {
      flex: 1,
    },
  });

  return (
    <MainContainer isLoading={isLoading}>
      <View style={[styles.animatedContainer, { paddingBottom: keyboardHeight + CHAT_INPUT_HEIGHT }]}>
        <FileEditor
          filename={title}
          initialContent={content}
          mode={viewMode}
          onModeChange={setViewMode}
          onContentChange={setContent}
        />
      </View>
      <CustomModal
        isVisible={isConfirmModalVisible}
        title="変更を破棄しますか？"
        message="保存されていない変更があります。本当に破棄してよろしいですか？"
        buttons={[
          {
            text: 'キャンセル',
            style: 'cancel',
            onPress: () => setConfirmModalVisible(false),
          },
          {
            text: '破棄',
            style: 'destructive',
            onPress: () => {
              setConfirmModalVisible(false);
              if (nextAction) {
                navigation.dispatch(nextAction);
              }
            },
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
