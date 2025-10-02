/**
 * @file NoteListScreen.tsx
 * @summary このファイルは、アプリケーションのノート一覧画面をレンダリングします。
 * @responsibility ノートの表示、選択モードの管理、新規ノートの作成、および選択されたノートの操作（削除、コピー）を担当します。
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
import { useNoteStore, useNoteStoreSelectors, useNoteStoreActions } from '../../store/noteStore';
import { FabButton } from '../../components/FabButton';
import { ListItem } from '../../components/ListItem';
import { useCustomHeader } from '../../components/CustomHeader';
import { commonStyles, colors, spacing } from '../../utils/commonStyles';
import { ChatInputBar } from '../chat/ChatInputBar';
import { ChatContext } from '../../services/llmService';
import { logger } from '../../utils/logger'; // loggerをインポート

// 入力バーの高さ（概算）
const CHAT_INPUT_HEIGHT = Platform.OS === 'ios' ? 78 : 66;

// ノート一覧画面コンポーネント
function NoteListScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { notes, loading, isSelectionMode, selectedNoteIds } = useNoteStoreSelectors();

  // デバッグ用ログ
  logger.debug('NoteListScreen render:', { isSelectionMode, selectedCount: selectedNoteIds.size });
  const {
    fetchNotes,
    createNote,
    toggleSelectionMode,
    toggleNoteSelection,
    clearSelectedNotes,
    deleteSelectedNotes,
    copySelectedNotes
  } = useNoteStoreActions();
  const isFocused = useIsFocused();
  const { createHeaderConfig } = useCustomHeader();

  useEffect(() => {
    if (isFocused) {
      fetchNotes();
    }
  }, [isFocused]);

  // ノート選択ハンドラー
  const handleSelectNote = (noteId: string) => {
    if (isSelectionMode) {
      toggleNoteSelection(noteId);
    } else {
      navigation.navigate('NoteEdit', { noteId });
    }
  };

  // ノート長押しハンドラー
  const handleLongPressNote = (noteId: string) => {
    if (!isSelectionMode) {
      toggleSelectionMode();
      toggleNoteSelection(noteId);
    }
  };

  // 選択キャンセルハンドラー
  const handleCancelSelection = () => {
    clearSelectedNotes();
  };

  // 選択ノート削除ハンドラー
  const handleDeleteSelected = async () => {
    try {
      await deleteSelectedNotes();
    } catch (error) {
      console.error("Failed to delete selected notes:", error);
    }
  };

  // 選択ノートコピーハンドラー
  const handleCopySelected = async () => {
    try {
      await copySelectedNotes();
    } catch (error) {
      console.error("Failed to copy selected notes:", error);
    }
  };

  // カスタムヘッダーの設定
  useLayoutEffect(() => {
    if (isSelectionMode) {
      const selectedCount = selectedNoteIds.size;
      navigation.setOptions(
        createHeaderConfig({
          title: <Text>{selectedCount}件選択中</Text>,
          leftButtons: [
            { title: 'キャンセル', onPress: handleCancelSelection, variant: 'secondary' },
          ],
          rightButtons: [
            {
              title: 'コピー',
              onPress: handleCopySelected,
              variant: 'primary'
            },
            {
              title: '削除',
              onPress: handleDeleteSelected,
              variant: 'danger'
            },
          ],
        })
      );
    } else {
      navigation.setOptions(
        createHeaderConfig({
          rightButtons: [
            { title: '設定', onPress: () => navigation.navigate('Settings'), variant: 'primary' },
          ],
        })
      );
    }
  }, [navigation, createHeaderConfig, isSelectionMode, selectedNoteIds.size, handleCancelSelection, handleCopySelected, handleDeleteSelected]);

  // ノート作成ハンドラー
  const handleCreateNote = async () => {
    try {
      const newNote = await createNote({ title: '新しいノート', content: '' });
      navigation.navigate('NoteEdit', { noteId: newNote.id });
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  };

  // ローディング中の表示
  if (loading.isLoading && notes.length === 0) {
    return (
      <View style={[commonStyles.container, commonStyles.centered]}>
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
      <ChatInputBar context={chatContext} />
      {(() => {
        logger.debug('FAB render check:', { isSelectionMode, shouldShow: !isSelectionMode });
        return !isSelectionMode ? <FabButton onPress={handleCreateNote} /> : null;
      })()}
    </View>
  );
}

// スタイル定義
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
