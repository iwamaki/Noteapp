/**
 * ノート一覧画面コンポーネント
 */  

import React, { useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation, NavigationProp, useIsFocused } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { useNoteStore } from '../../store/noteStore';
import { FabButton } from '../../components/FabButton';
import { ListItem } from '../../components/ListItem';
import { useCustomHeader } from '../../components/CustomHeader';
import { commonStyles, colors, spacing } from '../../utils/commonStyles';
import { ChatInputBar } from '../chat/components/ChatInputBar';
import { ChatContext } from '../../services/llmService';

// 入力バーの高さ（概算）
const CHAT_INPUT_HEIGHT = Platform.OS === 'ios' ? 78 : 66;

function NoteListScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { notes, loading, fetchNotes, createNote } = useNoteStore();
  const isFocused = useIsFocused();
  const { createHeaderConfig } = useCustomHeader();

  useEffect(() => {
    if (isFocused) {
      fetchNotes();
    }
  }, [isFocused]);

  useLayoutEffect(() => {
    navigation.setOptions(
      createHeaderConfig({
        rightButtons: [
          { title: '設定', onPress: () => navigation.navigate('Settings'), variant: 'primary' },
        ],
      })
    );
  }, [navigation, createHeaderConfig]);

  const handleSelectNote = (noteId: string) => {
    navigation.navigate('NoteEdit', { noteId });
  };

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
      <View style={[commonStyles.container, commonStyles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ChatInputBar />
      </View>
    );
  }

  const renderItem = ({ item }: { item: (typeof notes)[0] }) => (
    <ListItem title={item.title} subtitle={item.content} onPress={() => handleSelectNote(item.id)} />
  );

  const chatContext: ChatContext = {
    currentPath: '/',
    fileList: notes.map(note => ({ name: note.title, type: 'file' })),
  };

  return (
    <View style={commonStyles.container}>
      {notes.length === 0 && !loading.isLoading ? (
        <View style={[commonStyles.centered, styles.emptyContainer]}>
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
          contentContainerStyle={[styles.listContent, { paddingBottom: CHAT_INPUT_HEIGHT + spacing.xl }]}
        />
      )}
      <FabButton onPress={handleCreateNote} />
      <ChatInputBar context={chatContext} />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
  },
  emptyMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
  },
});

export default NoteListScreen;
