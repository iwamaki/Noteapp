/**
 * @file FileListScreenFlat.tsx
 * @summary フラット構造のファイルリスト画面
 * @description
 * フォルダ階層を廃止し、シンプルなフラットリストで全ファイルを表示。
 * 既存のFileListScreen.tsx（454行）から大幅に簡素化（~250行）。
 *
 * 削除した機能：
 * - フォルダ展開/折りたたみ
 * - 移動モード
 * - フォルダ選択
 * - パス管理
 *
 * 保持した機能：
 * - ファイル選択モード
 * - 削除、コピー、リネーム
 * - 検索
 */

import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { StyleSheet, FlatList, Alert, View, Text } from 'react-native';
import { useTheme } from '../../design/theme/ThemeContext';
import { MainContainer } from '../../components/MainContainer';
import { CustomModal } from '../../components/CustomModal';
import { useKeyboardHeight } from '../../contexts/KeyboardHeightContext';
import { FlatListProvider, useFlatListContext } from './context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { FileFlat } from '@data/core/typesFlat';
import { logger } from '../../utils/logger';
import { useSettingsStore } from '../../settings/settingsStore';
import { Ionicons } from '@expo/vector-icons';
import { FlatListItem } from './components/FlatListItem';
import { CreateFileModal } from './components/CreateFileModal';
import { RenameItemModal } from './components/RenameItemModal';
import { useFileListHeader } from './hooks/useFileListHeader';
// import { useFileListChatContext } from '../../features/chat/hooks/useFileListChatContext';
import { OverflowMenu } from './components/OverflowMenu';

function FileListScreenFlatContent() {
  const { colors, spacing } = useTheme();
  const { keyboardHeight, chatInputBarHeight } = useKeyboardHeight();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { settings } = useSettingsStore();

  const { state, dispatch, actions } = useFlatListContext();

  // 削除確認モーダルの状態
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  // データ初期読み込み（初回のみ）
  useEffect(() => {
    logger.info('file', 'FileListScreenFlat: Initial data refresh triggered.');
    actions.refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // === ハンドラの実装 ===

  /**
   * ファイル選択ハンドラ
   */
  const handleSelectFile = useCallback(
    (file: FileFlat) => {
      logger.debug('file', `handleSelectFile called for file: ${file.id}`);

      // 選択モード中
      if (state.isSelectionMode) {
        logger.debug('file', `Selection mode active. Toggling file: ${file.id}`);
        dispatch({ type: 'TOGGLE_SELECT_FILE', payload: file.id });
      } else {
        // 通常モード：ファイル編集画面へ遷移
        logger.info(
          'file',
          `Navigating to FileEdit for file: ${file.id} with initialViewMode: ${settings.defaultFileViewScreen}`
        );
        navigation.navigate('FileEdit', {
          fileId: file.id,
          initialViewMode: settings.defaultFileViewScreen,
        });
      }
    },
    [state.isSelectionMode, settings.defaultFileViewScreen, dispatch, navigation]
  );

  /**
   * 長押しハンドラ（選択モード開始）
   */
  const handleLongPressFile = useCallback(
    (file: FileFlat) => {
      logger.info('file', `Long press on file: ${file.id}. Entering selection mode.`);
      dispatch({ type: 'ENTER_SELECTION_MODE' });
      dispatch({ type: 'TOGGLE_SELECT_FILE', payload: file.id });
    },
    [dispatch]
  );

  /**
   * 選択解除ハンドラ
   */
  const handleCancelSelection = useCallback(() => {
    logger.info('file', 'Cancelling selection mode.');
    dispatch({ type: 'EXIT_SELECTION_MODE' });
  }, [dispatch]);

  /**
   * 削除確認モーダルを開く
   */
  const handleDeleteSelected = useCallback(async () => {
    logger.info('file', 'Opening delete confirmation modal');
    setShowDeleteConfirmModal(true);
  }, []);

  /**
   * 削除実行
   */
  const handleConfirmDelete = useCallback(async () => {
    logger.info(
      'file',
      `Attempting to delete selected files. Files: ${Array.from(
        state.selectedFileIds
      ).join(', ')}`
    );
    setShowDeleteConfirmModal(false);
    try {
      await actions.deleteSelectedFiles(Array.from(state.selectedFileIds));
      logger.info('file', 'Successfully deleted selected files.');
    } catch (error: any) {
      logger.error('file', `Failed to delete selected files: ${error.message}`, error);
    }
  }, [actions, state.selectedFileIds]);

  /**
   * コピーハンドラ
   */
  const handleCopySelected = useCallback(async () => {
    logger.info(
      'file',
      `Attempting to copy selected files: ${Array.from(state.selectedFileIds).join(
        ', '
      )}`
    );
    try {
      await actions.copySelectedFiles(Array.from(state.selectedFileIds));
      logger.info('file', 'Successfully copied selected files.');
    } catch (error: any) {
      logger.error('file', `Failed to copy selected files: ${error.message}`, error);
    }
  }, [actions, state.selectedFileIds]);

  /**
   * リネームモーダルを開く
   */
  const handleOpenRenameModal = useCallback(
    (id: string) => {
      logger.info('file', `Opening rename modal for file with ID: ${id}`);
      const file = state.files.find((f) => f.id === id);

      if (file) {
        dispatch({ type: 'OPEN_RENAME_MODAL', payload: file });
      } else {
        logger.warn('file', `File not found for rename modal: ID ${id}`);
      }
    },
    [state.files, dispatch]
  );

  /**
   * リネーム実行
   */
  const handleRename = useCallback(
    async (newName: string) => {
      if (state.modals.rename.file) {
        const file = state.modals.rename.file;
        logger.info('file', `Attempting to rename file from ${file.title} to ${newName}`);
        try {
          await actions.renameFile(file.id, newName);
          logger.info('file', `Successfully renamed file to ${newName}`);
          dispatch({ type: 'CLOSE_RENAME_MODAL' });
          Alert.alert('成功', '名前を変更しました');
        } catch (error: any) {
          logger.error('file', `Failed to rename file to ${newName}: ${error.message}`, error);
          Alert.alert('エラー', error.message);
        }
      }
    },
    [state.modals.rename.file, actions, dispatch]
  );

  /**
   * 作成実行
   */
  const handleCreate = useCallback(
    async (title: string, categories: string[], tags: string[]) => {
      logger.info('file', `Attempting to create new file: ${title}`);
      try {
        const file = await actions.createFile(title, '', categories, tags);
        logger.info('file', `Successfully created file: ${file.id}`);
        dispatch({ type: 'CLOSE_CREATE_MODAL' });
        navigation.navigate('FileEdit', {
          fileId: file.id,
          initialViewMode: settings.defaultFileViewScreen,
        });
      } catch (error: any) {
        logger.error('file', `Failed to create file ${title}: ${error.message}`, error);
        Alert.alert('エラー', error.message);
      }
    },
    [actions, dispatch, navigation, settings.defaultFileViewScreen]
  );

  // キーボード + ChatInputBarの高さを計算してコンテンツが隠れないようにする
  const chatBarOffset = chatInputBarHeight + keyboardHeight;

  // キーボードオフセット依存スタイル（メモ化）
  const contentContainerStyle = useMemo(
    () => [
      {
        paddingBottom: chatBarOffset,
        padding: spacing.md,
      },
    ],
    [chatBarOffset, spacing.md]
  );

  // ヘッダー設定
  useFileListHeader({
    isSelectionMode: state.isSelectionMode,
    selectedFileIds: state.selectedFileIds,
    selectedFolderIds: new Set(), // フォルダなし
    handleCancelSelection,
    handleDeleteSelected,
    handleCopySelected,
    handleOpenRenameModal,
    startMoveMode: () => {}, // 移動モードなし
    isMoveMode: false,
    cancelMoveMode: () => {},
    rightButtons: [
      {
        icon: <OverflowMenu onCreateNew={() => dispatch({ type: 'OPEN_CREATE_MODAL' })} />,
        onPress: () => {}, // Not used
      },
    ],
  });

  // チャットコンテキスト
  // TODO: useFileListChatContextを新しいFlatListContext対応版に更新
  // useFileListChatContext({
  //   items: state.files.map((f) => ({ type: 'file' as const, item: f })),
  //   currentPath: '/', // フラット構造では常に"/"
  // });

  // レンダリングアイテム
  const renderFileItem = useCallback(
    ({ item: file }: { item: FileFlat }) => {
      const isSelected = state.selectedFileIds.has(file.id);

      return (
        <FlatListItem
          file={file}
          isSelected={isSelected}
          isSelectionMode={state.isSelectionMode}
          onPress={() => handleSelectFile(file)}
          onLongPress={() => handleLongPressFile(file)}
        />
      );
    },
    [state.selectedFileIds, state.isSelectionMode, handleSelectFile, handleLongPressFile]
  );

  // レンダリング時のデバッグログ
  logger.debug(
    'file',
    `FileListScreenFlat: Rendering. files.length: ${state.files.length}, state.loading: ${state.loading}`
  );

  const messageTextStyle = useMemo(
    () => ({
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center' as const,
      paddingHorizontal: spacing.xl,
    }),
    [colors.textSecondary, spacing.xl]
  );

  return (
    <MainContainer
      backgroundColor={colors.secondary}
      isLoading={state.loading && state.files.length === 0}
    >
      {state.files.length === 0 && !state.loading ? (
        <View style={styles.centered}>
          <Text style={messageTextStyle}>
            ファイルがありません。+ ボタンから新しいファイルを作成してください。
          </Text>
        </View>
      ) : (
        <FlatList
          data={state.files}
          renderItem={renderFileItem}
          keyExtractor={(file) => file.id}
          contentContainerStyle={contentContainerStyle}
          keyboardShouldPersistTaps="handled"
        />
      )}

      <CreateFileModal
        visible={state.modals.create.visible}
        onClose={() => dispatch({ type: 'CLOSE_CREATE_MODAL' })}
        onCreate={handleCreate}
      />

      {state.modals.rename.file && (
        <RenameItemModal
          visible={state.modals.rename.visible}
          initialName={state.modals.rename.file.title}
          itemType="file"
          onClose={() => dispatch({ type: 'CLOSE_RENAME_MODAL' })}
          onRename={handleRename}
        />
      )}

      <CustomModal
        isVisible={showDeleteConfirmModal}
        title="削除確認"
        message={`選択したファイル（${state.selectedFileIds.size}件）を削除しますか？この操作は取り消せません。`}
        buttons={[
          {
            text: 'キャンセル',
            style: 'cancel',
            onPress: () => setShowDeleteConfirmModal(false),
          },
          {
            text: '削除',
            style: 'destructive',
            onPress: handleConfirmDelete,
          },
        ]}
        onClose={() => setShowDeleteConfirmModal(false)}
      />
    </MainContainer>
  );
}

/**
 * FileListScreenFlat (Providerでラップ)
 */
function FileListScreenFlat() {
  return (
    <FlatListProvider>
      <FileListScreenFlatContent />
    </FlatListProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FileListScreenFlat;
