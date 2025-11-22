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

// ===== React & React Native =====
import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { StyleSheet, SectionList, Alert, View, Text, TouchableOpacity } from 'react-native';

// ===== Navigation =====
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';

// ===== Contexts & Stores =====
import { useTheme } from '../../design/theme/ThemeContext';
import { useFlatListStore } from './stores/useFlatListStore';
import { useUISettingsStore, useEditorSettingsStore } from '../../settings/settingsStore';

// ===== Shared Components =====
import { MainContainer } from '../../components/MainContainer';
import { CustomModal } from '../../components/CustomModal';

// ===== Local Components =====
import { FlatListItem } from './components/FlatListItem';
import { CreateFileModal } from './components/CreateFileModal';
import { RenameItemModal } from './components/RenameItemModal';
import { FileActionsModal } from './components/FileActionsModal';
import { CategoryEditModal } from './components/CategoryEditModal';
import { TagEditModal } from './components/TagEditModal';
import { CategorySectionHeader } from './components/CategorySectionHeader';
import { CategoryActionsModal } from './components/CategoryActionsModal';
import { CategoryRenameModal } from './components/CategoryRenameModal';

// ===== Hooks =====
import { useFileListHeader } from './hooks/useFileListHeader';
import { useCategoryCollapse } from './hooks/useCategoryCollapse';
import { useFileListChatContext } from '../../features/chat/hooks/useFileListChatContext';
import { useImportExport } from './hooks/useImportExport';
import { useRAGSync } from './hooks/useRAGSync';

// ===== Types =====
import { FileFlat } from '@data/core/typesFlat';
import { CategoryImpact } from '@data/services/categoryOperationsService';
import { CategoryActionInfo, CategoryInfo, CategoryDeleteInfo } from './types';

// ===== Services & Utils =====
import { groupFilesByCategoryHierarchical } from '@data/services/categoryGroupingService';
import { CategoryOperationsService } from '@data/services/categoryOperationsService';
import ChatService from '../../features/chat';
import { logger } from '../../utils/logger';
import { getCategoryNameFromPath } from './utils';
import { FILE_LIST_FLAT_CONFIG } from './config';

function FileListScreenFlat() {
  // FileListScreen レンダリング開始を記録
  logger.info('init', '📄 FileListScreen rendering...');

  const { colors, spacing } = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const uiSettings = useUISettingsStore((state) => state.settings);
  const editorSettings = useEditorSettingsStore((state) => state.settings);

  // Zustandストアから状態とアクションを取得
  const {
    // 状態
    files,
    loading,
    isMoveMode,
    moveSourceFileId,
    modals,
    // アクション
    refreshData,
    createFile,
    renameFile,
    deleteSelectedFiles,
    copySelectedFiles,
    updateFileCategory,
    updateFileTags,
    moveFile,
    enterMoveMode,
    exitMoveMode,
    selectMoveSource,
    openCreateModal,
    closeCreateModal,
    openRenameModal,
    closeRenameModal,
  } = useFlatListStore();

  // インポート/エクスポート機能
  const { handleImport, handleExportFile, handleExportCategory, isProcessing } = useImportExport();

  // RAG同期機能
  const { syncCategoryToRAG, isSyncing } = useRAGSync();

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

  // カテゴリーアクションモーダルの状態
  const [selectedCategoryForActions, setSelectedCategoryForActions] = useState<CategoryActionInfo | null>(null);
  // カテゴリー名変更モーダルの状態
  const [showCategoryRenameModal, setShowCategoryRenameModal] = useState(false);
  const [categoryForRename, setCategoryForRename] = useState<CategoryInfo | null>(null);
  const [categoryRenameImpact, setCategoryRenameImpact] = useState<CategoryImpact | null>(null);
  // カテゴリー削除確認モーダルの状態
  const [showCategoryDeleteConfirmModal, setShowCategoryDeleteConfirmModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryDeleteInfo | null>(null);

  // データ初期読み込み（初回マウント時のみ実行）
  useEffect(() => {
    logger.info('init', '📄 FileListScreen mounted, triggering initial data load...');
    refreshData();
  }, []);

  // ローディング完了を監視
  useEffect(() => {
    if (!loading && files.length > 0) {
      logger.info('init', '✅ FileListScreen data loaded and rendered');
    }
  }, [loading, files.length]);

  // 画面がフォーカスされた時にデータを再取得（編集画面から戻ってきた時など）
  useFocusEffect(
    useCallback(() => {
      logger.info('file', 'FileListScreenFlat: Screen focused, refreshing data...');
      refreshData();
    }, [refreshData])
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
        `Navigating to FileEdit for file: ${file.id} with initialViewMode: ${editorSettings.defaultFileViewScreen}`
      );
      navigation.navigate('FileEdit', {
        fileId: file.id,
        initialViewMode: editorSettings.defaultFileViewScreen,
      });
    },
    [editorSettings.defaultFileViewScreen, navigation]
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
      await deleteSelectedFiles([fileToDelete.id]);
      logger.info('file', 'Successfully deleted file.');
      setFileToDelete(null);
    } catch (error: any) {
      logger.error('file', `Failed to delete file: ${error.message}`, error);
      setFileToDelete(null);
    }
  }, [deleteSelectedFiles, fileToDelete]);

  /**
   * コピーハンドラ
   */
  const handleCopyFile = useCallback(async (file: FileFlat) => {
    logger.info('file', `Attempting to copy file: ${file.id}`);
    try {
      await copySelectedFiles([file.id]);
      logger.info('file', 'Successfully copied file.');
    } catch (error: any) {
      logger.error('file', `Failed to copy file: ${error.message}`, error);
    }
  }, [copySelectedFiles]);

  /**
   * リネームモーダルを開く
   */
  const handleOpenRenameModal = useCallback(
    (file: FileFlat) => {
      logger.info('file', `Opening rename modal for file: ${file.id}`);
      openRenameModal(file);
    },
    [openRenameModal]
  );

  /**
   * リネーム実行
   */
  const handleRename = useCallback(
    async (newName: string) => {
      if (modals.rename.file) {
        const file = modals.rename.file;
        logger.info('file', `Attempting to rename file from ${file.title} to ${newName}`);
        try {
          await renameFile(file.id, newName);
          logger.info('file', `Successfully renamed file to ${newName}`);
          closeRenameModal();
        } catch (error: any) {
          logger.error('file', `Failed to rename file to ${newName}: ${error.message}`, error);
          Alert.alert('エラー', error.message);
        }
      }
    },
    [modals.rename.file, renameFile, closeRenameModal]
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
        await updateFileCategory(fileForCategoryEdit.id, category);
        logger.info('file', 'Successfully updated category');
        setShowCategoryEditModal(false);
        setFileForCategoryEdit(null);
      } catch (error: any) {
        logger.error('file', `Failed to update category: ${error.message}`, error);
        Alert.alert('エラー', error.message);
      }
    },
    [fileForCategoryEdit, updateFileCategory]
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
        await updateFileTags(fileForTagEdit.id, tags);
        logger.info('file', 'Successfully updated tags');
        setShowTagEditModal(false);
        setFileForTagEdit(null);
      } catch (error: any) {
        logger.error('file', `Failed to update tags: ${error.message}`, error);
        Alert.alert('エラー', error.message);
      }
    },
    [fileForTagEdit, updateFileTags]
  );

  /**
   * カテゴリー長押しハンドラー（アクションモーダル表示）
   */
  const handleLongPressCategory = useCallback(
    (categoryPath: string, categoryName: string, fileCount: number) => {
      logger.info('file', `Long press on category: ${categoryPath}. Opening actions modal.`);
      setSelectedCategoryForActions({ path: categoryPath, name: categoryName, fileCount });
    },
    []
  );

  /**
   * カテゴリー削除確認モーダルを開く
   */
  const handleDeleteCategory = useCallback(
    async (categoryPath: string) => {
      logger.info('file', `Opening delete confirmation for category: ${categoryPath}`);

      try {
        // 影響範囲を取得
        const impact = await CategoryOperationsService.getCategoryImpact(categoryPath);
        const categoryName = getCategoryNameFromPath(categoryPath);

        setCategoryToDelete({ path: categoryPath, name: categoryName, impact });
        setShowCategoryDeleteConfirmModal(true);
      } catch (error: any) {
        logger.error('file', `Failed to get category impact: ${error.message}`, error);
        Alert.alert('エラー', error.message);
      }
    },
    []
  );

  /**
   * カテゴリー削除実行
   */
  const handleConfirmDeleteCategory = useCallback(async () => {
    if (!categoryToDelete) return;

    logger.info('file', `Attempting to delete category: ${categoryToDelete.path}`);
    setShowCategoryDeleteConfirmModal(false);

    try {
      await CategoryOperationsService.deleteCategory(categoryToDelete.path);
      logger.info('file', 'Category deleted successfully');
      setCategoryToDelete(null);
      await refreshData();
    } catch (error: any) {
      logger.error('file', `Failed to delete category: ${error.message}`, error);
      setCategoryToDelete(null);
      Alert.alert('エラー', error.message);
    }
  }, [categoryToDelete, refreshData]);

  /**
   * カテゴリー名変更モーダルを開く
   */
  const handleOpenCategoryRenameModal = useCallback(
    async (categoryPath: string) => {
      logger.info('file', `Opening rename modal for category: ${categoryPath}`);

      try {
        const impact = await CategoryOperationsService.getCategoryImpact(categoryPath);
        const categoryName = getCategoryNameFromPath(categoryPath);

        setCategoryForRename({ path: categoryPath, name: categoryName });
        setCategoryRenameImpact(impact);
        setShowCategoryRenameModal(true);
      } catch (error: any) {
        logger.error('file', `Failed to get category impact: ${error.message}`, error);
        Alert.alert('エラー', error.message);
      }
    },
    []
  );

  /**
   * カテゴリー名変更実行
   */
  const handleRenameCategory = useCallback(
    async (newPath: string) => {
      if (!categoryForRename) return;

      logger.info('file', `Attempting to rename category from ${categoryForRename.path} to ${newPath}`);

      try {
        await CategoryOperationsService.moveCategory(categoryForRename.path, newPath);
        logger.info('file', 'Category renamed successfully');
        setShowCategoryRenameModal(false);
        setCategoryForRename(null);
        setCategoryRenameImpact(null);
        await refreshData();
      } catch (error: any) {
        logger.error('file', `Failed to rename category: ${error.message}`, error);
        Alert.alert('エラー', error.message);
      }
    },
    [categoryForRename, refreshData]
  );


  /**
   * 移動モード開始ハンドラ
   */
  const handleStartMove = useCallback((file: FileFlat) => {
    logger.info('file', `Starting move mode for source file: ${file.id}, category: ${file.category}`);
    enterMoveMode(file.category || '未分類');
    selectMoveSource(file.id);
  }, [enterMoveMode, selectMoveSource]);

  /**
   * 移動モード終了ハンドラ
   */
  const handleCancelMove = useCallback(() => {
    logger.info('file', 'Canceling move mode');
    exitMoveMode();
  }, [exitMoveMode]);

  /**
   * チャット添付ハンドラ
   */
  const handleAttachToChat = useCallback(async (file: FileFlat) => {
    logger.info('file', `Attaching file to chat: ${file.id} (${file.title})`);
    try {
      await ChatService.attachFile(file.id);
      // 成功時はAlertを表示せず、UIの添付ファイル表示のみで通知
    } catch (error: any) {
      logger.error('file', `Failed to attach file to chat: ${error.message}`, error);
      Alert.alert('エラー', 'ファイルの添付に失敗しました');
    }
  }, []);

  /**
   * ファイルエクスポートハンドラ
   */
  const handleExportFileWrapper = useCallback((file: FileFlat) => {
    logger.info('file', `Exporting file: ${file.id} (${file.title})`);
    handleExportFile(file.id);
  }, [handleExportFile]);

  /**
   * カテゴリーエクスポートハンドラ
   */
  const handleExportCategoryWrapper = useCallback((categoryPath: string) => {
    logger.info('file', `Exporting category: ${categoryPath}`);
    handleExportCategory(categoryPath);
  }, [handleExportCategory]);

  /**
   * Q&A作成ハンドラ（RAG同期）
   */
  const handleCreateQA = useCallback((categoryPath: string, categoryName: string) => {
    logger.info('file', `Creating Q&A for category: ${categoryPath}`);
    syncCategoryToRAG(categoryPath, categoryName);
  }, [syncCategoryToRAG]);

  /**
   * 作成実行
   */
  const handleCreate = useCallback(
    async (title: string, category: string, tags: string[]) => {
      logger.info('file', `Attempting to create new file: ${title}`);
      try {
        const file = await createFile(title, '', category, tags);
        logger.info('file', `Successfully created file: ${file.id}`);
        closeCreateModal();
        // ファイル一覧に留まるため、遷移しない
      } catch (error: any) {
        logger.error('file', `Failed to create file ${title}: ${error.message}`, error);
        Alert.alert('エラー', error.message);
      }
    },
    [createFile, closeCreateModal]
  );

  // === セクションデータの計算 ===

  /**
   * ファイルをカテゴリーでグループ化（階層構造対応）
   * categoryGroupingService を使用
   */
  const sections = useMemo(() => {
    console.log(`[FileListScreen] Grouping files with fileSortMethod: ${uiSettings.fileSortMethod}`);
    return groupFilesByCategoryHierarchical(files, uiSettings.categorySortMethod, uiSettings.fileSortMethod);
  }, [files, uiSettings.categorySortMethod, uiSettings.fileSortMethod]);

  /**
   * カテゴリーの展開/折りたたみ状態管理
   * useCategoryCollapse hook を使用
   */
  const { expandedCategories, handleToggleCategory, visibleSections } = useCategoryCollapse({
    sections,
  });

  /**
   * ファイルタップハンドラ（移動モード時）
   */
  const handleMoveTap = useCallback(
    async (file: FileFlat, index: number, categoryPath: string) => {
      // 移動元ファイルがセットされていない場合は何もしない
      if (!moveSourceFileId) {
        logger.warn('file', 'Move source file not set');
        return;
      }

      // 同じファイルをタップした場合は何もしない
      if (file.id === moveSourceFileId) {
        logger.debug('file', 'Same file tapped, ignoring');
        return;
      }

      logger.info('file', `Moving file to category: ${categoryPath}, index: ${index}`);

      try {
        await moveFile(moveSourceFileId, categoryPath, index);
        logger.info('file', 'File moved successfully');
        exitMoveMode();
      } catch (error: any) {
        logger.error('file', `Failed to move file: ${error.message}`, error);
        Alert.alert('エラー', 'ファイルの移動に失敗しました');
      }
    },
    [moveSourceFileId, moveFile, exitMoveMode]
  );

  /**
   * カテゴリーヘッダータップハンドラ（移動モード時）
   */
  const handleCategoryHeaderTap = useCallback(
    async (categoryPath: string) => {
      // 移動モードでない場合は何もしない
      if (!isMoveMode || !moveSourceFileId) {
        return;
      }

      logger.info('file', `Moving file to category: ${categoryPath} (end of list)`);

      try {
        // カテゴリーの最後に移動（targetIndexを指定しない）
        await moveFile(moveSourceFileId, categoryPath);
        logger.info('file', 'File moved successfully');
        exitMoveMode();
      } catch (error: any) {
        logger.error('file', `Failed to move file: ${error.message}`, error);
        Alert.alert('エラー', 'ファイルの移動に失敗しました');
      }
    },
    [isMoveMode, moveSourceFileId, moveFile, exitMoveMode]
  );

  // contentContainerStyleをメモ化
  const contentContainerStyle = useMemo(
    () => ({
      padding: spacing.md,
    }),
    [spacing.md]
  );

  /**
   * インポート実行（データ再取得付き）
   */
  const handleImportWithRefresh = useCallback(async () => {
    await handleImport();
    // インポート完了後にデータを再取得
    await refreshData();
  }, [handleImport, refreshData]);

  // ヘッダー設定（新規作成、インポート、設定ボタン）
  useFileListHeader({
    onCreateNew: openCreateModal,
    onSettings: () => navigation.navigate('Settings'),
    onImport: handleImportWithRefresh,
  });

  // チャットコンテキスト（フラット構造版）
  useFileListChatContext({
    files,
    refreshData,
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
          onTap={isMoveMode ? () => handleCategoryHeaderTap(section.fullPath) : undefined}
          onLongPress={!isMoveMode ? handleLongPressCategory : undefined}
          isMoveMode={isMoveMode}
        />
      );
    },
    [expandedCategories, handleToggleCategory, sections, isMoveMode, handleCategoryHeaderTap, handleLongPressCategory]
  );

  /**
   * ファイルアイテムのプレスハンドラー（メモ化用）
   */
  const handleFilePress = useCallback(
    (file: FileFlat, index: number, categoryPath: string) => {
      if (isMoveMode) {
        handleMoveTap(file, index, categoryPath);
      } else {
        handleSelectFile(file);
      }
    },
    [isMoveMode, handleMoveTap, handleSelectFile]
  );

  /**
   * ファイルアイテムのレンダリング
   * パフォーマンス最適化: インライン関数を避け、メモ化を有効にする
   */
  const renderFileItem = useCallback(
    ({ item: file, index, section }: { item: FileFlat; index: number; section: { level: number; fullPath: string } }) => {
      // 移動モード時の処理
      const isMoveSource = moveSourceFileId === file.id;

      // インライン関数を避けるため、一時変数として定義
      const handlePress = () => handleFilePress(file, index, section.fullPath);
      const handleLongPress = () => handleLongPressFile(file);

      return (
        <FlatListItem
          file={file}
          level={section.level}
          isSelected={isMoveSource}
          isSelectionMode={isMoveMode}
          onPress={handlePress}
          onLongPress={handleLongPress}
        />
      );
    },
    [isMoveMode, moveSourceFileId, handleFilePress, handleLongPressFile]
  );

  // レンダリング時のデバッグログ
  logger.debug(
    'file',
    `FileListScreenFlat: Rendering. files.length: ${files.length}, loading: ${loading}`
  );

  const messageTextStyle = useMemo(
    () => ({
      fontSize: FILE_LIST_FLAT_CONFIG.typography.message,
      color: colors.textSecondary,
      textAlign: 'center' as const,
      paddingHorizontal: spacing.xl,
    }),
    [colors.textSecondary, spacing.xl]
  );

  return (
    <MainContainer
      backgroundColor={colors.background}
      isLoading={(loading && files.length === 0) || isProcessing || isSyncing}
    >
      {files.length === 0 && !loading ? (
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

      {/* 移動モード時のキャンセルボタン */}
      {/* eslint-disable react-native/no-inline-styles */}
      {isMoveMode && (
        <View style={[styles.moveBar, { backgroundColor: colors.background }]}>
          <Text style={{ fontSize: FILE_LIST_FLAT_CONFIG.typography.heading, color: colors.text }}>
            移動先をタップしてください
          </Text>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelMove}
          >
            <Text style={{ fontSize: FILE_LIST_FLAT_CONFIG.typography.heading, color: colors.primary, fontWeight: '600' }}>
              キャンセル
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {/* eslint-enable react-native/no-inline-styles */}

      <CreateFileModal
        visible={modals.create.visible}
        onClose={closeCreateModal}
        onCreate={handleCreate}
      />

      {modals.rename.file && (
        <RenameItemModal
          visible={modals.rename.visible}
          initialName={modals.rename.file.title}
          onClose={closeRenameModal}
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
        onMove={handleStartMove}
        onAttachToChat={handleAttachToChat}
        onExport={handleExportFileWrapper}
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

      {/* カテゴリーアクションモーダル */}
      <CategoryActionsModal
        visible={selectedCategoryForActions !== null}
        categoryPath={selectedCategoryForActions?.path || null}
        categoryName={selectedCategoryForActions?.name || null}
        fileCount={selectedCategoryForActions?.fileCount || 0}
        onClose={() => setSelectedCategoryForActions(null)}
        onDelete={handleDeleteCategory}
        onRename={handleOpenCategoryRenameModal}
        onExport={handleExportCategoryWrapper}
        onCreateQA={handleCreateQA}
      />

      {/* カテゴリー名変更モーダル */}
      {categoryForRename && (
        <CategoryRenameModal
          visible={showCategoryRenameModal}
          categoryPath={categoryForRename.path}
          categoryName={categoryForRename.name}
          impact={categoryRenameImpact}
          onClose={() => {
            setShowCategoryRenameModal(false);
            setCategoryForRename(null);
            setCategoryRenameImpact(null);
          }}
          onRename={handleRenameCategory}
        />
      )}

      {/* カテゴリー削除確認モーダル */}
      {categoryToDelete && (
        <CustomModal
          isVisible={showCategoryDeleteConfirmModal}
          title="カテゴリー削除"
          message={`「${categoryToDelete.path}」を削除しますか？\n\n⚠️ この操作は取り消せません\n\n削除される内容:\n• 直接属するファイル: ${categoryToDelete.impact.directFileCount}個${
            categoryToDelete.impact.childCategories.length > 0
              ? `\n• 子カテゴリー: ${categoryToDelete.impact.childCategories.length}個 (${categoryToDelete.impact.totalFileCount - categoryToDelete.impact.directFileCount}個のファイル)`
              : ''
          }\n━━━━━━━━━━━━━━━━━━\n合計: ${categoryToDelete.impact.totalFileCount}個のファイルが削除されます`}
          buttons={[
            {
              text: 'キャンセル',
              style: 'cancel',
              onPress: () => {
                setShowCategoryDeleteConfirmModal(false);
                setCategoryToDelete(null);
              },
            },
            {
              text: '削除する',
              style: 'destructive',
              onPress: handleConfirmDeleteCategory,
            },
          ]}
          onClose={() => {
            setShowCategoryDeleteConfirmModal(false);
            setCategoryToDelete(null);
          }}
        />
      )}
    </MainContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moveBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: FILE_LIST_FLAT_CONFIG.spacing.moveBar.horizontal,
    paddingVertical: FILE_LIST_FLAT_CONFIG.spacing.moveBar.vertical,
    borderTopWidth: 1,
    borderTopColor: FILE_LIST_FLAT_CONFIG.appearance.borderColor,
    shadowColor: FILE_LIST_FLAT_CONFIG.appearance.shadowColor,
    shadowOffset: FILE_LIST_FLAT_CONFIG.interaction.shadowOffset,
    shadowOpacity: FILE_LIST_FLAT_CONFIG.appearance.transparency.shadow,
    shadowRadius: FILE_LIST_FLAT_CONFIG.interaction.shadowRadius,
    elevation: FILE_LIST_FLAT_CONFIG.interaction.elevation,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});

export default FileListScreenFlat;
