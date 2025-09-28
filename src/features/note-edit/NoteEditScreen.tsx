import React, { useLayoutEffect, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { FileEditor, ViewMode } from './components/FileEditor';
import { useNoteEditor } from './hooks/useNoteEditor';

type NoteEditScreenRouteProp = RouteProp<RootStackParamList, 'NoteEdit'>;

function NoteEditScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<NoteEditScreenRouteProp>();
  const { noteId } = route.params || {};

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
    navigation.setOptions({
      headerTitle: () => (
        <TextInput
          value={title}
          onChangeText={setTitle}
          style={styles.headerTitle}
          placeholder="ノートのタイトル"
        />
      ),
      headerRight: () => (
        <View style={{ flexDirection: 'row', marginRight: 10 }}>
          <TouchableOpacity onPress={handleGoToDiff} style={{ paddingHorizontal: 10 }}>
            <Text style={styles.headerButton}>保存</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('VersionHistory', { noteId: activeNote?.id || '' })} style={{ paddingHorizontal: 10 }}>
            <Text style={styles.headerButton}>履歴</Text>
          </TouchableOpacity>
        </View>
      ),
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingHorizontal: 10 }}>
          <Text style={styles.headerButton}>戻る</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, title, activeNote, handleGoToDiff]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
    width: 200,
  },
  headerButton: {
      color: '#007AFF',
      fontSize: 16,
  }
});

export default NoteEditScreen;