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
import { FileFlat, FileCategorySectionHierarchical } from '@data/core/typesFlat';
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
   * 作成実行
   */
  const handleCreate = useCallback(
    async (title: string, category: string, tags: string[]) => {
      logger.info('file', `Attempting to create new file: ${title}`);
      try {
        const file = await actions.createFile(title, '', category, tags);
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
   * ファイルをカテゴリーでグループ化（階層構造対応）
   * Phase 2A: 階層的グルーピング（展開固定）
   */
  const sections = useMemo<FileCategorySectionHierarchical[]>(() => {
    const uncategorizedKey = '未分類';

    // Step 1: カテゴリー情報を収集・解析
    interface CategoryNode {
      fullPath: string;
      level: number;
      parent: string | null;
      directFileIds: Set<string>;
      childPaths: Set<string>;
    }

    const categoryNodes = new Map<string, CategoryNode>();

    // カテゴリーノードを作成（親カテゴリーも自動生成）
    const ensureCategoryNode = (fullPath: string) => {
      if (categoryNodes.has(fullPath)) return;

      const parts = fullPath.split('/');
      const level = parts.length - 1;
      const parent = level > 0 ? parts.slice(0, -1).join('/') : null;

      categoryNodes.set(fullPath, {
        fullPath,
        level,
        parent,
        directFileIds: new Set(),
        childPaths: new Set(),
      });

      // 親カテゴリーも再帰的に作成
      if (parent) {
        ensureCategoryNode(parent);
        const parentNode = categoryNodes.get(parent)!;
        parentNode.childPaths.add(fullPath);
      }
    };

    // Step 2: ファイルをカテゴリーに振り分け
    const fileMap = new Map<string, FileFlat>();
    for (const file of state.files) {
      fileMap.set(file.id, file);

      const category = file.category || uncategorizedKey;
      ensureCategoryNode(category);
      categoryNodes.get(category)!.directFileIds.add(file.id);
    }

    // Step 3: 各カテゴリーの総ファイル数を計算（子孫も含む）
    const calculateTotalFileCount = (fullPath: string): number => {
      const node = categoryNodes.get(fullPath);
      if (!node) return 0;

      let total = node.directFileIds.size;
      for (const childPath of node.childPaths) {
        total += calculateTotalFileCount(childPath);
      }
      return total;
    };

    // Step 4: FileCategorySectionHierarchical配列に変換
    const sectionsArray: FileCategorySectionHierarchical[] = [];

    for (const [fullPath, node] of categoryNodes.entries()) {
      const parts = fullPath.split('/');
      const category = parts[parts.length - 1];
      const fileCount = calculateTotalFileCount(fullPath);
      const directFiles = Array.from(node.directFileIds)
        .map(id => fileMap.get(id)!)
        .filter(Boolean);

      sectionsArray.push({
        category,
        fullPath,
        level: node.level,
        parent: node.parent,
        fileCount,
        directFiles,
      });
    }

    // Step 5: ソート
    // - 未分類は最後
    // - 同じ親を持つカテゴリー同士でfileCount降順
    // - 親カテゴリーの直後にその子カテゴリーが続く
    const sortedSections: FileCategorySectionHierarchical[] = [];
    const added = new Set<string>();

    const addCategoryAndChildren = (fullPath: string) => {
      if (added.has(fullPath)) return;

      const section = sectionsArray.find(s => s.fullPath === fullPath);
      if (!section) return;

      sortedSections.push(section);
      added.add(fullPath);

      // 子カテゴリーを取得してソート（fileCount降順）
      const children = sectionsArray
        .filter(s => s.parent === fullPath)
        .sort((a, b) => b.fileCount - a.fileCount);

      for (const child of children) {
        addCategoryAndChildren(child.fullPath);
      }
    };

    // ルートカテゴリー（parent === null）から開始
    const rootCategories = sectionsArray
      .filter(s => s.parent === null && s.fullPath !== uncategorizedKey)
      .sort((a, b) => b.fileCount - a.fileCount);

    for (const root of rootCategories) {
      addCategoryAndChildren(root.fullPath);
    }

    // 未分類を最後に追加
    const uncategorizedSection = sectionsArray.find(s => s.fullPath === uncategorizedKey);
    if (uncategorizedSection) {
      sortedSections.push(uncategorizedSection);
    }

    return sortedSections;
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
   * セクションヘッダーのレンダリング（階層構造対応）
   */
  const renderSectionHeader = useCallback(
    ({ section }: { section: { category: string; level: number; fileCount: number; data: FileFlat[] } }) => {
      // 階層レベルに応じたパディング（24pxずつ増加）
      const paddingLeft = 16 + (section.level * 24);

      // 階層レベルに応じた背景色（段階的に薄くなる）
      const getBackgroundColor = (level: number): string => {
        const baseValue = 0xD0; // 208 (濃いグレー)
        const increment = 0x0A; // 10 (段階的に明るくする増分)
        const colorValue = Math.min(0xF0, baseValue + (level * increment));
        const hex = colorValue.toString(16).toUpperCase();
        return `#${hex}${hex}${hex}`;
      };

      const headerBackgroundColor = getBackgroundColor(section.level);

      return (
        <View
          style={[
            styles.sectionHeader,
            {
              backgroundColor: headerBackgroundColor,
              borderBottomColor: colors.border,
              paddingLeft,
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
            fullPath: section.fullPath,
            level: section.level,
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
