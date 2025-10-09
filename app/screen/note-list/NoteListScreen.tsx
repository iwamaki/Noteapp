import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { ListItem } from '../../components/ListItem';
import { ChatInputBar } from '../chat/ChatInputBar';
import { ChatContext } from '../../services/llmService';
import { useTheme } from '../../theme/ThemeContext';
import { useNoteListLogic } from './hooks/useNoteListLogic';
import { useNoteListHeader } from './hooks/useNoteListHeader';
import { NoteListEmptyState } from './components/NoteListEmptyState';
import { NoteListFabButton } from './components/NoteListFabButton';

// 入力バーの高さ（概算）
const CHAT_INPUT_HEIGHT = Platform.OS === 'ios' ? 78 : 66;

// ノート一覧画面コンポーネント
function NoteListScreen() {
  const { colors, spacing } = useTheme();

  const {
    notes,
    loading,
    isSelectionMode,
    selectedNoteIds,
    handleSelectNote,
    handleLongPressNote,
    handleCancelSelection,
    handleDeleteSelected,
    handleCopySelected,
    handleCreateNote,
    fetchNotes,
  } = useNoteListLogic();

  useNoteListHeader({
    isSelectionMode,
    selectedNoteIds,
    handleCancelSelection,
    handleDeleteSelected,
    handleCopySelected,
  });

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.secondary,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
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

  // ローディング中の表示
  if (loading.isLoading && notes.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ChatInputBar />
      </View>
    );
  }

  // ノートリストのレンダラー
  const renderItem = ({ item }: { item: (typeof notes)[0] }) => (
    <ListItem
      title={item.title}
      subtitle={item.content}
      onPress={() => handleSelectNote(item.id)}
      onLongPress={() => handleLongPressNote(item.id)}
      isSelected={selectedNoteIds.has(item.id)}
      isSelectionMode={isSelectionMode}
    />
  );

  // チャットコンテキストの設定
  const chatContext: ChatContext = {
    currentPath: '/',
    fileList: notes.map(note => ({ name: note.title, type: 'file' })),
  };

  // メインの表示
  return (
    <View style={styles.container}>
      {notes.length === 0 && !loading.isLoading ? (
        <NoteListEmptyState
          containerStyle={styles.centered}
          messageStyle={styles.emptyMessage}
        />
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
      <ChatInputBar context={chatContext} />
      <NoteListFabButton
        isSelectionMode={isSelectionMode}
        onPress={handleCreateNote}
      />
    </View>
  );
}

export default NoteListScreen;
