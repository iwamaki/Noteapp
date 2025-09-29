/**
 * ノート一覧画面コンポーネント
 * 
 */  

import React, { useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation, NavigationProp, useIsFocused } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { useNoteStore } from '../../store/noteStore';
import { FabButton } from '../../components/FabButton';
import { ListItem } from '../../components/ListItem';
import { useCustomHeader } from '../../components/CustomHeader';
import { commonStyles, colors, spacing } from '../../utils/commonStyles';

// NoteListScreenコンポーネント
function NoteListScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { notes, loading, fetchNotes, createNote } = useNoteStore();
  const isFocused = useIsFocused();
  const { createHeaderConfig } = useCustomHeader();

  // フォーカスされたときにノートを再取得
  useEffect(() => {
    if (isFocused) {
      fetchNotes();
    }
  }, [isFocused]);

  // ヘッダーに設定ボタンを追加
  useLayoutEffect(() => {
    navigation.setOptions(
      createHeaderConfig({
        rightButtons: [
          {
            title: '設定',
            onPress: () => navigation.navigate('Settings'),
            variant: 'primary',
          },
        ],
      })
    );
  }, [navigation, createHeaderConfig]);

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
      <View style={[commonStyles.container, commonStyles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ノートアイテムのレンダラー
  const renderItem = ({ item }: { item: (typeof notes)[0] }) => (
    <ListItem
      title={item.title}
      subtitle={item.content}
      onPress={() => handleSelectNote(item.id)}
    />
  );

  // メインレンダリング
  return (
    <View style={commonStyles.container}>
      {notes.length === 0 && !loading.isLoading ? (
        <View style={[commonStyles.container, commonStyles.centered]}>
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
          contentContainerStyle={{ padding: spacing.md }}
        />
      )}
      <FabButton onPress={handleCreateNote} />
    </View>
  );
}

// スタイル定義
const styles = StyleSheet.create({
  emptyMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  list: {
    flex: 1,
  },
});

export default NoteListScreen;
