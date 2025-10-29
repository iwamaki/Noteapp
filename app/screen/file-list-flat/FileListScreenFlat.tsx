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
import { StyleSheet, SectionList, Alert, View, Text } from 'react-native';
import { useTheme } from '../../design/theme/ThemeContext';
import { MainContainer } from '../../components/MainContainer';
import { CustomModal } from '../../components/CustomModal';
import { useKeyboardHeight } from '../../contexts/KeyboardHeightContext';
import { FlatListProvider, useFlatListContext } from './context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { FileFlat, FileCategorySection } from '@data/core/typesFlat';
import { logger } from '../../utils/logger';
import { useSettingsStore } from '../../settings/settingsStore';
import { Ionicons } from '@expo/vector-icons';
import { FlatListItem } from './components/FlatListItem';
import { CreateFileModal } from './components/CreateFileModal';
import { RenameItemModal } from './components/RenameItemModal';
import { FileActionsModal } from './components/FileActionsModal';
import { CategoryEditModal } from './components/CategoryEditModal';
import { TagEditModal } from './components/TagEditModal';
import { useFileListHeader } from './hooks/useFileListHeader';
import { useFileListChatContext } from '../../features/chat/hooks/useFileListChatContext';
import { OverflowMenu } from './components/OverflowMenu';

function FileListScreenFlatContent() {
  const { colors, spacing } = useTheme();
  const { keyboardHeight, chatInputBarHeight } = useKeyboardHeight();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { settings } = useSettingsStore();

  const { state, dispatch, actions } = useFlatListContext();

  // アクションモーダルの状態
  const [selectedFileForActions, setSelectedFileForActions] = useState<FileFlat | null>(null);
  // 削除確認モーダルの状態
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileFlat | null>(null);
  // カテゴリー編集モーダルの状態
  const [showCategoryEditModal, setShowCategoryEditModal] = useState(false);
  const [fileForCategoryEdit, setFileForCategoryEdit] = useState<FileFlat | null>(null);
  // タグ編集モーダルの状態
  const [showTagEditModal, setShowTagEditModal] = useState(false);
  const [fileForTagEdit, setFileForTagEdit] = useState<FileFlat | null>(null);

  // データ初期読み込み（初回のみ）
  useEffect(() => {
    logger.info('file', 'FileListScreenFlat: Initial data refresh triggered.');
    actions.refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // === ハンドラの実装 ===

  /**
   * ファイル選択ハンドラ（タップ）
   */
  const handleSelectFile = useCallback(
    (file: FileFlat) => {
      logger.debug('file', `handleSelectFile called for file: ${file.id}`);

      // ファイル編集画面へ遷移
      logger.info(
        'file',
        `Navigating to FileEdit for file: ${file.id} with initialViewMode: ${settings.defaultFileViewScreen}`
      );
      navigation.navigate('FileEdit', {
        fileId: file.id,
        initialViewMode: settings.defaultFileViewScreen,
      });
    },
    [settings.defaultFileViewScreen, navigation]
  );

  /**
   * 長押しハンドラ（アクションモーダル表示）
   */
  const handleLongPressFile = useCallback(
    (file: FileFlat) => {
      logger.info('file', `Long press on file: ${file.id}. Opening actions modal.`);
      setSelectedFileForActions(file);
    },
    []
  );

  /**
   * 削除確認モーダルを開く
   */
  const handleDeleteFile = useCallback((file: FileFlat) => {
    logger.info('file', `Opening delete confirmation modal for file: ${file.id}`);
    setFileToDelete(file);
    setShowDeleteConfirmModal(true);
  }, []);

  /**
   * 削除実行
   */
  const handleConfirmDelete = useCallback(async () => {
    if (!fileToDelete) return;

    logger.info('file', `Attempting to delete file: ${fileToDelete.id}`);
    setShowDeleteConfirmModal(false);
    try {
      await actions.deleteSelectedFiles([fileToDelete.id]);
      logger.info('file', 'Successfully deleted file.');
      setFileToDelete(null);
    } catch (error: any) {
      logger.error('file', `Failed to delete file: ${error.message}`, error);
      setFileToDelete(null);
    }
  }, [actions, fileToDelete]);

  /**
   * コピーハンドラ
   */
  const handleCopyFile = useCallback(async (file: FileFlat) => {
    logger.info('file', `Attempting to copy file: ${file.id}`);
    try {
      await actions.copySelectedFiles([file.id]);
      logger.info('file', 'Successfully copied file.');
    } catch (error: any) {
      logger.error('file', `Failed to copy file: ${error.message}`, error);
    }
  }, [actions]);

  /**
   * リネームモーダルを開く
   */
  const handleOpenRenameModal = useCallback(
    (file: FileFlat) => {
      logger.info('file', `Opening rename modal for file: ${file.id}`);
      dispatch({ type: 'OPEN_RENAME_MODAL', payload: file });
    },
    [dispatch]
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
   * カテゴリー編集モーダルを開く
   */
  const handleOpenCategoryEditModal = useCallback((file: FileFlat) => {
    logger.info('file', `Opening category edit modal for file: ${file.id}`);
    setFileForCategoryEdit(file);
    setShowCategoryEditModal(true);
  }, []);

  /**
   * カテゴリー保存
   */
  const handleSaveCategories = useCallback(
    async (categories: string[]) => {
      if (!fileForCategoryEdit) return;

      logger.info('file', `Attempting to update categories for file: ${fileForCategoryEdit.id}`);
      try {
        await actions.updateFileCategories(fileForCategoryEdit.id, categories);
        logger.info('file', 'Successfully updated categories');
        setShowCategoryEditModal(false);
        setFileForCategoryEdit(null);
        Alert.alert('成功', 'カテゴリーを更新しました');
      } catch (error: any) {
        logger.error('file', `Failed to update categories: ${error.message}`, error);
        Alert.alert('エラー', error.message);
      }
    },
    [fileForCategoryEdit, actions]
  );

  /**
   * タグ編集モーダルを開く
   */
  const handleOpenTagEditModal = useCallback((file: FileFlat) => {
    logger.info('file', `Opening tag edit modal for file: ${file.id}`);
    setFileForTagEdit(file);
    setShowTagEditModal(true);
  }, []);

  /**
   * タグ保存
   */
  const handleSaveTags = useCallback(
    async (tags: string[]) => {
      if (!fileForTagEdit) return;

      logger.info('file', `Attempting to update tags for file: ${fileForTagEdit.id}`);
      try {
        await actions.updateFileTags(fileForTagEdit.id, tags);
        logger.info('file', 'Successfully updated tags');
        setShowTagEditModal(false);
        setFileForTagEdit(null);
        Alert.alert('成功', 'タグを更新しました');
      } catch (error: any) {
        logger.error('file', `Failed to update tags: ${error.message}`, error);
        Alert.alert('エラー', error.message);
      }
    },
    [fileForTagEdit, actions]
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

  // === セクションデータの計算 ===

  /**
   * ファイルをカテゴリーでグループ化
   * Phase 1: フラットなグルーピング（階層構造なし）
   */
  const sections = useMemo<FileCategorySection[]>(() => {
    const categoryMap = new Map<string, FileFlat[]>();
    const uncategorizedKey = '未分類';

    for (const file of state.files) {
      if (file.categories.length === 0) {
        // カテゴリーを持たないファイルは「未分類」に追加
        const files = categoryMap.get(uncategorizedKey) || [];
        files.push(file);
        categoryMap.set(uncategorizedKey, files);
      } else {
        // 各カテゴリーに重複して追加
        for (const category of file.categories) {
          const files = categoryMap.get(category) || [];
          files.push(file);
          categoryMap.set(category, files);
        }
      }
    }

    // FileCategorySection配列に変換
    const sectionArray: FileCategorySection[] = Array.from(
      categoryMap.entries()
    ).map(([category, files]) => ({
      category,
      fileCount: files.length,
      files,
    }));

    // ソート：「未分類」以外はファイル数の多い順、「未分類」は常に最後
    return sectionArray.sort((a, b) => {
      if (a.category === uncategorizedKey) return 1;
      if (b.category === uncategorizedKey) return -1;
      return b.fileCount - a.fileCount;
    });
  }, [state.files]);

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

  // ヘッダー設定（シンプル化：作成ボタンのみ）
  useFileListHeader({
    isSelectionMode: false,
    selectedFileIds: new Set(),
    selectedFolderIds: new Set(),
    handleCancelSelection: () => {},
    handleDeleteSelected: async () => {},
    handleCopySelected: async () => {},
    handleOpenRenameModal: () => {},
    rightButtons: [
      {
        icon: <OverflowMenu onCreateNew={() => dispatch({ type: 'OPEN_CREATE_MODAL' })} />,
        onPress: () => {}, // Not used
      },
    ],
  });

  // チャットコンテキスト（フラット構造版）
  useFileListChatContext({
    files: state.files,
    refreshData: actions.refreshData,
  });

  // === レンダリング関数 ===

  /**
   * セクションヘッダーのレンダリング
   */
  const renderSectionHeader = useCallback(
    ({ section }: { section: { category: string; fileCount: number; data: FileFlat[] } }) => {
      return (
        <View
          style={[
            styles.sectionHeader,
            {
              backgroundColor: colors.background,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.sectionHeaderText,
              {
                color: colors.text,
              },
            ]}
          >
            {section.category} ({section.fileCount})
          </Text>
        </View>
      );
    },
    [colors]
  );

  /**
   * ファイルアイテムのレンダリング
   */
  const renderFileItem = useCallback(
    ({ item: file }: { item: FileFlat }) => {
      return (
        <FlatListItem
          file={file}
          isSelected={false}
          isSelectionMode={false}
          onPress={() => handleSelectFile(file)}
          onLongPress={() => handleLongPressFile(file)}
        />
      );
    },
    [handleSelectFile, handleLongPressFile]
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
        <SectionList
          sections={sections.map((section) => ({
            category: section.category,
            fileCount: section.fileCount,
            data: section.files,
          }))}
          renderItem={renderFileItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(file) => file.id}
          contentContainerStyle={contentContainerStyle}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={true}
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

      <FileActionsModal
        visible={selectedFileForActions !== null}
        file={selectedFileForActions}
        onClose={() => setSelectedFileForActions(null)}
        onDelete={handleDeleteFile}
        onCopy={handleCopyFile}
        onRename={handleOpenRenameModal}
        onEditCategories={handleOpenCategoryEditModal}
        onEditTags={handleOpenTagEditModal}
      />

      <CustomModal
        isVisible={showDeleteConfirmModal}
        title="削除確認"
        message={`「${fileToDelete?.title}」を削除しますか？この操作は取り消せません。`}
        buttons={[
          {
            text: 'キャンセル',
            style: 'cancel',
            onPress: () => {
              setShowDeleteConfirmModal(false);
              setFileToDelete(null);
            },
          },
          {
            text: '削除',
            style: 'destructive',
            onPress: handleConfirmDelete,
          },
        ]}
        onClose={() => {
          setShowDeleteConfirmModal(false);
          setFileToDelete(null);
        }}
      />

      {fileForCategoryEdit && (
        <CategoryEditModal
          visible={showCategoryEditModal}
          initialCategories={fileForCategoryEdit.categories}
          fileName={fileForCategoryEdit.title}
          onClose={() => {
            setShowCategoryEditModal(false);
            setFileForCategoryEdit(null);
          }}
          onSave={handleSaveCategories}
        />
      )}

      {fileForTagEdit && (
        <TagEditModal
          visible={showTagEditModal}
          initialTags={fileForTagEdit.tags}
          fileName={fileForTagEdit.title}
          onClose={() => {
            setShowTagEditModal(false);
            setFileForTagEdit(null);
          }}
          onSave={handleSaveTags}
        />
      )}
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
  sectionHeader: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FileListScreenFlat;
