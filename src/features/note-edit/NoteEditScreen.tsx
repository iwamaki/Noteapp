import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, StyleSheet, Alert, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { useNoteStore } from '../../store/noteStore';
import { FileEditor, ViewMode } from './components/FileEditor';

type NoteEditScreenRouteProp = RouteProp<RootStackParamList, 'NoteEdit'>;

function NoteEditScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<NoteEditScreenRouteProp>();
  const { noteId } = route.params || {};

  const { activeNote, selectNote, setDraftNote } = useNoteStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('edit');

  useEffect(() => {
    if (noteId) {
      selectNote(noteId);
    } else {
      useNoteStore.getState().createNewNote();
    }
  }, [noteId]);

  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title);
      setContent(activeNote.content);
    } else {
      setTitle('新しいノート');
      setContent('');
    }
  }, [activeNote]);

  const handleGoToDiff = () => {
    setDraftNote({ title, content });
    navigation.navigate('DiffView'); // パラメーターからコールバック関数を削除
  };

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
  }, [navigation, title, content, activeNote]);

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
        onSave={handleGoToDiff} // Pass the save handler
        onClose={() => navigation.goBack()}
        onContentChange={setContent} // Assuming FileEditor supports this to update content
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
