import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { FileEditor, ViewMode } from './components/FileEditor'; 
import { ChatPanel } from '../chat/ChatPanel';
import { ChatContext } from '../../services/llmService';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';

type NoteEditScreenRouteProp = RouteProp<RootStackParamList, 'NoteEdit'>;
type NoteEditScreenNavigationProp = StackNavigationProp<RootStackParamList, 'NoteEdit'>;

interface NoteEditScreenProps {
  route: NoteEditScreenRouteProp;
  navigation: NoteEditScreenNavigationProp;
}

function NoteEditScreen({ route, navigation }: NoteEditScreenProps) {
  const { filename = 'untitled.md', content: initialContent = '', saved } = route.params || {};

  const [currentContent, setCurrentContent] = useState(initialContent);
  const [viewMode, setViewMode] = useState<ViewMode>('content'); 
  const [isChatVisible, setIsChatVisible] = useState(false);

  useEffect(() => {
    if (saved) {
      Alert.alert('保存完了', 'ノートが保存されました');
      // 必要であれば、ここでNoteListScreenに戻るなどの処理を追加
      // navigation.navigate('NoteList');
    }
  }, [saved]);

  const handleSave = (newContent: string) => {
    // TODO: ここで実際の保存処理を実装
    // noteStoreを使用してノートを保存
    console.log('Saving content:', newContent);
    // DiffViewScreenへ遷移
    navigation.navigate('DiffView', {
      originalContent: currentContent,
      newContent: newContent,
      filename: filename,
    });
    setCurrentContent(newContent);
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const handleCommandReceived = (commands: any[]) => {
    // TODO: コマンド処理を実装
    console.log('Commands received:', commands);
    // ファイル操作などのコマンドを処理
  };

  // チャット用のコンテキスト
  const chatContext: ChatContext = {
    currentFile: filename,
    currentFileContent: {
      filename,
      content: currentContent,
      size: `${currentContent.length} characters`,
      type: 'file'
    },
    isEditMode: viewMode === 'edit',
    timestamp: new Date().toISOString(),
  };

  return (
    <View style={styles.container}>
      <FileEditor
        filename={filename}
        initialContent={currentContent}
        mode={viewMode}
        onModeChange={setViewMode}
        onSave={handleSave}
        onClose={handleClose}
      />

      <ChatPanel
        context={chatContext}
        onCommandReceived={handleCommandReceived}
        isVisible={isChatVisible}
        onClose={() => setIsChatVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default NoteEditScreen;
