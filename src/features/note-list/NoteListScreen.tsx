/**
 * ノート一覧画面
 *
 * ノートの一覧を表示し、選択や新規作成を行う画面です。
 */

import React, { useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, NavigationProp, useIsFocused } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { useNoteStore } from '../../store/noteStore';

// NoteListScreenコンポーネント
function NoteListScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { notes, loading, fetchNotes, createNote } = useNoteStore();
  const isFocused = useIsFocused();

  // フォーカスされたときにノートを再取得
  useEffect(() => {
    if (isFocused) {
      fetchNotes();
    }
  }, [isFocused]);

  // ヘッダーに設定ボタンを追加
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', marginRight: 10 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={{ marginLeft: 15 }}
          >
            <Text style={{ color: 'blue' }}>設定</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation]);

  // ノート選択と新規作成のハンドラ
  const handleSelectNote = (noteId: string) => {
    navigation.navigate('NoteEdit', { noteId });
  };

  // 新規作成のハンドラ
  const handleCreateNote = async () => {
    try {
      const newNote = await createNote({ title: '新しいノート', content: '' });
      navigation.navigate('NoteEdit', { noteId: newNote.id });
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  };

  if (loading.isLoading && notes.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // ノートアイテムのレンダラー
  const renderItem = ({ item }: { item: (typeof notes)[0] }) => (
    <TouchableOpacity
      style={styles.noteItem}
      onPress={() => handleSelectNote(item.id)}
    >
      <Text style={styles.noteTitle}>{item.title || '無題のノート'}</Text>
      <Text style={styles.noteContent} numberOfLines={1}>{item.content}</Text>
    </TouchableOpacity>
  );

  // メインレンダリング
  return (
    <View style={styles.container}>
      {notes.length === 0 && !loading.isLoading ? (
        <View style={[styles.container, styles.centered]}>
          <Text style={styles.emptyMessage}>ノートがありません。</Text>
          <Text style={styles.emptyMessage}>下の「+」ボタンから新しいノートを作成しましょう。</Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          onRefresh={fetchNotes}
          refreshing={loading.isLoading}
        />
      )}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateNote}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// スタイル定義
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
  },
  list: {
    flex: 1,
    padding: 10,
  },
  noteItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  noteContent: {
    fontSize: 14,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    backgroundColor: '#007AFF',
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  fabText: {
    fontSize: 24,
    color: 'white',
  },
});

export default NoteListScreen;
