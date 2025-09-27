import React, { useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, NavigationProp, useIsFocused } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { useNoteStore } from '../../store/noteStore';

function NoteListScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { notes, isLoading, fetchNotes, createNewNote } = useNoteStore();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      fetchNotes();
    }
  }, [isFocused]);

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

  const handleSelectNote = (noteId: string) => {
    navigation.navigate('NoteEdit', { noteId });
  };

  const handleCreateNewNote = () => {
    createNewNote();
    navigation.navigate('NoteEdit', {});
  };

  if (isLoading && notes.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const renderItem = ({ item }: { item: (typeof notes)[0] }) => (
    <TouchableOpacity
      style={styles.noteItem}
      onPress={() => handleSelectNote(item.id)}
    >
      <Text style={styles.noteTitle}>{item.title || '無題のノート'}</Text>
      <Text style={styles.noteContent} numberOfLines={1}>{item.content}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {notes.length === 0 && !isLoading ? (
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
          refreshing={isLoading}
        />
      )}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateNewNote}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

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
