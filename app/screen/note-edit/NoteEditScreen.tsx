import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator, Keyboard, Animated } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { FileEditor, ViewMode } from './components/FileEditor';
import { useNoteEditor } from './hooks/useNoteEditor';
import { useNoteEditHeader } from './hooks/useNoteEditHeader';
import { useTheme } from '../../design/theme/ThemeContext';
import { ChatInputBar } from '../../features/chat/ChatInputBar';
import { ChatContext, LLMCommand, } from '../../services/llmService/types/types';
import { CustomModal } from '../../components/CustomModal';
import { StackNavigationProp } from '@react-navigation/stack';

type NoteEditScreenRouteProp = RouteProp<RootStackParamList, 'NoteEdit'>;

// 入力バーの高さ（概算）
const CHAT_INPUT_HEIGHT = Platform.OS === 'ios' ? 90 : 100;

// ノート編集画面コンポーネント
function NoteEditScreen() {
  const { colors } = useTheme();
  const route = useRoute<NoteEditScreenRouteProp>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { noteId } = route.params || {};

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
  const paddingBottomAnim = useRef(new Animated.Value(CHAT_INPUT_HEIGHT)).current;

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


  // キーボードイベントのリスナー
  useEffect(() => {
    const keyboardWillShow = (e: any) => {
      const height = e.endCoordinates.height;
      Animated.timing(paddingBottomAnim, {
        toValue: CHAT_INPUT_HEIGHT + height,
        duration: e.duration || 250,
        useNativeDriver: false,
      }).start();
    };

    const keyboardWillHide = (e: any) => {
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

  // チャットエリアの作成
  const chatContext: ChatContext = {
    currentFile: note?.id,
    currentFileContent: {
      filename: title,
      content: content,
    },
  };

  // コマンドハンドラーの定義（拡張性を考慮したマップパターン）
  const handleEditFile = (command: LLMCommand) => {
    if (typeof command.content === 'string') {
      const newContent = command.content.replace(/^---\s*/, '').replace(/\s*---$/, '');
      setContent(newContent);
    }
  };

  const handleReadFile = (command: LLMCommand) => {
    // read_fileコマンドの処理
    // Agent実装により、read_fileはバックエンドで自動的に処理されるため、
    // フロントエンドでは特に何もする必要がありません
    console.log(`[read_file] ファイル読み込みコマンドを受信: ${command.path}`);
    console.log(`[read_file] このコマンドはバックエンドのAgentで既に処理済みです`);

    // 将来的な拡張: 読み込んだファイルをUIに表示する、など
  };

  // コマンドハンドラーマップ（新しいツールの追加が容易）
  const commandHandlers: Record<string, (command: LLMCommand) => void | Promise<void>> = {
    'edit_file': handleEditFile,
    'read_file': handleReadFile,
    // 将来的に他のツールを追加する場合は、ここに追加するだけ
    // 例: 'create_file': handleCreateFile,
    //     'delete_file': handleDeleteFile,
  };

  const handleCommandReceived = (commands: LLMCommand[]) => {
    for (const command of commands) {
      const handler = commandHandlers[command.action];
      if (handler) {
        handler(command);
      } else {
        console.warn(`[NoteEditScreen] 未知のコマンド: ${command.action}`);
      }
    }
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
        currentNoteTitle={title}
        currentNoteContent={content}
      />
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
    </View>
  );
}

export default NoteEditScreen;
