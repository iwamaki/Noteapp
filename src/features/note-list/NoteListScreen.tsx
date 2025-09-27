import React, { useLayoutEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';

// 仮のノートデータ
const dummyNotes = [
  { id: '1', title: '初めてのノート', content: 'これは最初のノートの内容です。' },
  { id: '2', title: '今日のTodo', content: '牛乳を買う\nパンを焼く\nプログラミングの学習' },
  { id: '3', title: 'アイデアメモ', content: '新しいアプリのアイデア：AI搭載のレシピジェネレーター' },
];

function NoteListScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', marginRight: 10 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('VersionHistory', { noteId: 'dummy' })} // 仮のnoteId
            style={{ marginLeft: 15 }}
          >
            <Text style={{ color: 'blue' }}>履歴</Text>
          </TouchableOpacity>
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

  const renderItem = ({ item }: { item: typeof dummyNotes[0] }) => (
    <TouchableOpacity
      style={styles.noteItem}
      onPress={() => navigation.navigate('NoteEdit', { noteId: item.id, filename: item.title + '.md', content: item.content })}
    >
      <Text style={styles.noteTitle}>{item.title}</Text>
      <Text style={styles.noteContent} numberOfLines={1}>{item.content}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={dummyNotes}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NoteEdit', { filename: '新規ノート.md', content: '' })}
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
