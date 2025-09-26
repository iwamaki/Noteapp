import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { FileEditor, ViewMode } from '../components/editor/FileEditor';
import { ChatComponent } from '../components/chat/ChatComponent';
import { ChatContext } from '../services/llmService';

interface NoteEditScreenProps {
  route: {
    params: {
      filename?: string;
      content?: string;
      noteId?: string;
    };
  };
  navigation: any;
}

function NoteEditScreen({ route, navigation }: NoteEditScreenProps) {
  const { filename = 'untitled.md', content = '', noteId } = route.params || {};

  const [viewMode, setViewMode] = useState<ViewMode>('content');
  const [isChatVisible, setIsChatVisible] = useState(false);

  const handleSave = (newContent: string) => {
    // TODO: ここで実際の保存処理を実装
    // noteStoreを使用してノートを保存
    console.log('Saving content:', newContent);
    Alert.alert('保存完了', 'ノートが保存されました');
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
      content,
      size: `${content.length} characters`,
      type: 'file'
    },
    isEditMode: viewMode === 'edit',
    timestamp: new Date().toISOString(),
  };

  return (
    <View style={styles.container}>
      <FileEditor
        filename={filename}
        initialContent={content}
        mode={viewMode}
        onModeChange={setViewMode}
        onSave={handleSave}
        onClose={handleClose}
      />

      <ChatComponent
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
