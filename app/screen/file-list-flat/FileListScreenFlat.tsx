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
import { StyleSheet, SectionList, Alert, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../design/theme/ThemeContext';
import { MainContainer } from '../../components/MainContainer';
import { CustomModal } from '../../components/CustomModal';
import { useKeyboardHeight } from '../../contexts/KeyboardHeightContext';
import { FlatListProvider, useFlatListContext } from './context';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { FileFlat, FileCategorySectionHierarchical } from '@data/core/typesFlat';
import { logger } from '../../utils/logger';
import { useSettingsStore } from '../../settings/settingsStore';
import { FlatListItem } from './components/FlatListItem';
import { CreateFileModal } from './components/CreateFileModal';
import { RenameItemModal } from './components/RenameItemModal';
import { FileActionsModal } from './components/FileActionsModal';
import { CategoryEditModal } from './components/CategoryEditModal';
import { TagEditModal } from './components/TagEditModal';
import { CategorySectionHeader } from './components/CategorySectionHeader';
import { useFileListHeader } from './hooks/useFileListHeader';
import { useCategoryCollapse } from './hooks/useCategoryCollapse';
import { useFileListChatContext } from '../../features/chat/hooks/useFileListChatContext';
import { groupFilesByCategoryHierarchical } from '@data/services/categoryGroupingService';

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

  // データ初期読み込み（初回マウント時のみ実行）
  useEffect(() => {
    logger.info('file', 'FileListScreenFlat: Initial data refresh triggered.');
    actions.refreshData();
  }, []);

  // 画面がフォーカスされた時にデータを再取得（編集画面から戻ってきた時など）
  useFocusEffect(
    useCallback(() => {
      logger.info('file', 'FileListScreenFlat: Screen focused, refreshing data...');
      actions.refreshData();
    }, [actions])
  );

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
  const handleSaveCategory = useCallback(
    async (category: string) => {
      if (!fileForCategoryEdit) return;

      logger.info('file', `Attempting to update category for file: ${fileForCategoryEdit.id}`);
      try {
        await actions.updateFileCategory(fileForCategoryEdit.id, category);
        logger.info('file', 'Successfully updated category');
        setShowCategoryEditModal(false);
        setFileForCategoryEdit(null);
        Alert.alert('成功', 'カテゴリーを更新しました');
      } catch (error: any) {
        logger.error('file', `Failed to update category: ${error.message}`, error);
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
   * 並び替えモード開始ハンドラ
   */
  const handleStartReorder = useCallback((file: FileFlat) => {
    logger.info('file', `Starting reorder mode for category: ${file.category}, source file: ${file.id}`);
    dispatch({ type: 'ENTER_REORDER_MODE', payload: file.category || '未分類' });
    dispatch({ type: 'SELECT_REORDER_SOURCE', payload: file.id });
  }, [dispatch]);

  /**
   * 並び替えモード終了ハンドラ
   */
  const handleCancelReorder = useCallback(() => {
    logger.info('file', 'Canceling reorder mode');
    dispatch({ type: 'EXIT_REORDER_MODE' });
  }, [dispatch]);

  /**
   * 作成実行
   */
  const handleCreate = useCallback(
    async (title: string, category: string, tags: string[]) => {
      logger.info('file', `Attempting to create new file: ${title}`);
      try {
        const file = await actions.createFile(title, '', category, tags);
        logger.info('file', `Successfully created file: ${file.id}`);
        dispatch({ type: 'CLOSE_CREATE_MODAL' });
        // ファイル一覧に留まるため、遷移しない
      } catch (error: any) {
        logger.error('file', `Failed to create file ${title}: ${error.message}`, error);
        Alert.alert('エラー', error.message);
      }
    },
    [actions, dispatch]
  );

  // === セクションデータの計算 ===

  /**
   * ファイルをカテゴリーでグループ化（階層構造対応）
   * categoryGroupingService を使用
   */
  const sections = useMemo(
    () => groupFilesByCategoryHierarchical(state.files),
    [state.files]
  );

  /**
   * カテゴリーの展開/折りたたみ状態管理
   * useCategoryCollapse hook を使用
   */
  const { expandedCategories, handleToggleCategory, visibleSections } = useCategoryCollapse({
    sections,
  });

  /**
   * ファイルタップハンドラ（並び替えモード時）
   */
  const handleReorderTap = useCallback(
    async (file: FileFlat, index: number) => {
      // 移動元ファイルがセットされていない場合は何もしない
      if (!state.reorderSourceFileId) {
        logger.warn('file', 'Reorder source file not set');
        return;
      }

      // 同じファイルをタップした場合は何もしない
      if (file.id === state.reorderSourceFileId) {
        logger.debug('file', 'Same file tapped, ignoring');
        return;
      }

      logger.info('file', `Moving file to index: ${index}`);

      // 現在のセクションデータから該当カテゴリーのファイルリストを取得
      const targetSection = sections.find((s) => s.fullPath === state.reorderCategoryPath);
      if (!targetSection) {
        logger.error('file', 'Target category section not found');
        return;
      }

      // 既にソート済みのdirectFilesを使用
      const categoryFiles = targetSection.directFiles;

      // 移動元ファイルのインデックスを取得
      const sourceIndex = categoryFiles.findIndex((f) => f.id === state.reorderSourceFileId);
      if (sourceIndex === -1) {
        logger.error('file', 'Source file not found in category');
        return;
      }

      // 配列を並び替え（切り取って挿入）
      const reordered = [...categoryFiles];
      const [movedFile] = reordered.splice(sourceIndex, 1);
      reordered.splice(index, 0, movedFile);

      // orderフィールドを付与
      const filesWithOrder = reordered.map((f, i) => ({ ...f, order: i }));

      try {
        await actions.reorderFiles(filesWithOrder);
        logger.info('file', 'Files reordered successfully');
        dispatch({ type: 'EXIT_REORDER_MODE' });
      } catch (error: any) {
        logger.error('file', `Failed to reorder files: ${error.message}`, error);
        Alert.alert('エラー', 'ファイルの並び替えに失敗しました');
      }
    },
    [state.reorderSourceFileId, state.reorderCategoryPath, sections, actions, dispatch]
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

  // ヘッダー設定（新規作成ボタンと設定ボタン）
  useFileListHeader({
    onCreateNew: () => dispatch({ type: 'OPEN_CREATE_MODAL' }),
    onSettings: () => navigation.navigate('Settings'),
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
    ({ section }: { section: { category: string; fullPath: string; level: number; fileCount: number; parent: string | null; data: FileFlat[] } }) => {
      const isExpanded = expandedCategories.has(section.fullPath);

      // 元のsectionsデータから直下ファイル数を取得（折りたたみ状態に関わらず）
      const originalSection = sections.find(s => s.fullPath === section.fullPath);
      const hasDirectFiles = (originalSection?.directFiles.length ?? 0) > 0;
      const hasChildCategories = sections.some(s => s.parent === section.fullPath);

      // 子カテゴリーまたは直下ファイルがある場合、開閉アイコンを表示
      const hasChildren = hasChildCategories || hasDirectFiles;

      // SectionList の section から FileCategorySectionHierarchical 形式に変換
      const hierarchicalSection = {
        category: section.category,
        fullPath: section.fullPath,
        level: section.level,
        parent: section.parent,
        fileCount: section.fileCount,
        directFiles: section.data,
      };

      return (
        <CategorySectionHeader
          section={hierarchicalSection}
          isExpanded={isExpanded}
          hasChildren={hasChildren}
          onToggle={handleToggleCategory}
        />
      );
    },
    [expandedCategories, handleToggleCategory, sections]
  );

  /**
   * ファイルアイテムのレンダリング
   */
  const renderFileItem = useCallback(
    ({ item: file, index, section }: { item: FileFlat; index: number; section: { level: number; fullPath: string } }) => {
      // 並び替えモード時の処理
      const isReorderMode = state.isReorderMode && state.reorderCategoryPath === section.fullPath;
      const isReorderSource = state.reorderSourceFileId === file.id;

      return (
        <FlatListItem
          file={file}
          level={section.level}
          isSelected={isReorderSource}
          isSelectionMode={false}
          onPress={() => {
            if (isReorderMode) {
              handleReorderTap(file, index);
            } else {
              handleSelectFile(file);
            }
          }}
          onLongPress={() => handleLongPressFile(file)}
          reorderMode={isReorderMode}
          reorderIndex={isReorderMode ? index + 1 : undefined}
        />
      );
    },
    [state.isReorderMode, state.reorderCategoryPath, state.reorderSourceFileId, handleSelectFile, handleLongPressFile, handleReorderTap]
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
          sections={visibleSections.map((section) => ({
            category: section.category,
            fullPath: section.fullPath,
            level: section.level,
            parent: section.parent,
            fileCount: section.fileCount,
            data: section.directFiles,
          }))}
          renderItem={renderFileItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(file) => file.id}
          contentContainerStyle={contentContainerStyle}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={true}
        />
      )}

      {/* 並び替えモード時のキャンセルボタン */}
      {state.isReorderMode && (
        <View style={[styles.reorderBar, { backgroundColor: colors.background }]}>
          <Text style={{ fontSize: 14, color: colors.text }}>
            移動先をタップしてください
          </Text>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelReorder}
          >
            <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '600' }}>
              キャンセル
            </Text>
          </TouchableOpacity>
        </View>
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
        onReorder={handleStartReorder}
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
          initialCategory={fileForCategoryEdit.category}
          fileName={fileForCategoryEdit.title}
          onClose={() => {
            setShowCategoryEditModal(false);
            setFileForCategoryEdit(null);
          }}
          onSave={handleSaveCategory}
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
  reorderBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});

export default FileListScreenFlat;
