import React from 'react';
import {
  StyleSheet,
  FlatList,
  Platform,
} from 'react-native';
import { ListItem } from '../../components/ListItem';
import { ChatInputBar } from '../../features/chat/ChatInputBar';
import { useTheme } from '../../design/theme/ThemeContext';
import { useNoteListLogic } from './hooks/useNoteListLogic';
import { useNoteListHeader } from './hooks/useNoteListHeader';
import { useNoteListChatContext } from './hooks/useNoteListChatContext';
import { NoteListEmptyState } from './components/NoteListEmptyState';
import { NoteListFabButton } from './components/NoteListFabButton';
import { MainContainer } from '../../components/MainContainer';

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

  // チャットコンテキストプロバイダーを登録
  useNoteListChatContext({ notes });

  const styles = StyleSheet.create({
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

  // ノートリストのレンダラー
  const renderItem = ({ item }: { item: (typeof notes)[0] }) => (
    <ListItem.Container
      onPress={() => handleSelectNote(item.id)}
      onLongPress={() => handleLongPressNote(item.id)}
      isSelected={selectedNoteIds.has(item.id)}
      isSelectionMode={isSelectionMode}
    >
      <ListItem.Title numberOfLines={1}>
        {item.title || '無題のノート'}
      </ListItem.Title>
      {item.content && (
        <ListItem.Subtitle numberOfLines={1}>
          {item.content}
        </ListItem.Subtitle>
      )}
    </ListItem.Container>
  );

  // メインの表示
  return (
    <MainContainer
      backgroundColor={colors.secondary}
      isLoading={loading.isLoading && notes.length === 0}
    >
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
      <ChatInputBar />
      <NoteListFabButton
        isSelectionMode={isSelectionMode}
        onPress={handleCreateNote}
      />
    </MainContainer>
  );
}

export default NoteListScreen;
