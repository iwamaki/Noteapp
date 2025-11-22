/**
 * @file useRAGSync.tsx
 * @summary RAG（知識ベース）同期機能を提供するフック
 * @description
 * カテゴリー配下のテキストデータをバックエンドのRAG（永久保存コレクション）に送信し、
 * Q&A機能のための知識ベースを構築します。
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FileRepository } from '@data/repositories/fileRepository';
import { logger } from '../../../utils/logger';
import APIService from '../../../features/llmService/api';
import {
  sanitizeCategoryPathForCollection,
  filterFilesByCategory,
} from '../utils';
import { UseRAGSyncReturn } from '../types';

/**
 * RAG同期機能を提供するフック
 */
export const useRAGSync = (): UseRAGSyncReturn => {
  const { t } = useTranslation();
  const [isSyncing, setIsSyncing] = useState(false);

  /**
   * カテゴリー配下のテキストをRAGに同期
   * @param categoryPath カテゴリーのパス
   * @param categoryName カテゴリーの名前
   */
  const syncCategoryToRAG = useCallback(async (categoryPath: string, categoryName: string) => {
    try {
      setIsSyncing(true);
      logger.info('rag', `Starting RAG sync for category: ${categoryPath}`);

      // 全ファイルを取得
      const allFiles = await FileRepository.getAll();

      // 指定されたカテゴリーとそのサブカテゴリーに属するファイルをフィルタリング
      const categoryFiles = filterFilesByCategory(allFiles, categoryPath);

      if (categoryFiles.length === 0) {
        Alert.alert(t('rag.createQA.title'), t('rag.createQA.noFiles'));
        logger.warn('rag', `No files found in category: ${categoryPath}`);
        return;
      }

      logger.info('rag', `Found ${categoryFiles.length} files in category ${categoryPath}`);

      // 各ファイルのテキストを結合（区切り付き）
      const combinedText = categoryFiles
        .map(file => {
          // ファイルごとに区切り線とメタデータを追加
          const separator = '='.repeat(60);
          const header = `${separator}\n${t('rag.metadata.title')} ${file.title}\n${t('rag.metadata.category')} ${file.category || t('rag.metadata.uncategorized')}\n${separator}\n\n`;
          return header + file.content;
        })
        .join('\n\n');

      logger.debug('rag', `Combined text length: ${combinedText.length} characters`);

      // カテゴリーパスからコレクション名を生成
      const collectionName = sanitizeCategoryPathForCollection(categoryPath);
      logger.info('rag', `Using collection name: ${collectionName} for category: ${categoryPath}`);

      // バックエンドのRAGにアップロード（カテゴリー専用の永久コレクション）
      const result = await APIService.uploadTextToKnowledgeBase(
        combinedText,
        collectionName, // カテゴリー専用コレクション
        t('rag.metadata.categoryPrefix', { name: categoryName }), // メタデータのタイトル
        t('rag.metadata.categoryDescription', { count: categoryFiles.length }) // メタデータの説明
      );

      if (result.success) {
        logger.info('rag', `Successfully synced ${categoryFiles.length} files to RAG`);
        logger.info(
          'rag',
          `RAG stats: ${result.document?.chunks_created} chunks, ` +
          `${result.document?.total_characters} chars, ` +
          `total docs in KB: ${result.knowledge_base?.total_documents}`
        );

        Alert.alert(
          t('rag.createQA.completed'),
          t('rag.createQA.completedMessage', {
            categoryName,
            count: categoryFiles.length,
            collectionName,
            chunks: result.document?.chunks_created,
            characters: result.document?.total_characters
          }),
          [{ text: t('common.ok') }]
        );
      } else {
        throw new Error('RAG sync failed: ' + result.message);
      }
    } catch (error: any) {
      logger.error('rag', `RAG sync failed: ${error.message}`, error);
      Alert.alert(
        t('common.error'),
        `${t('rag.createQA.failed')}\n\n${error.message || 'ネットワークエラーが発生しました。'}`
      );
    } finally {
      setIsSyncing(false);
    }
  }, [t]);

  return {
    isSyncing,
    syncCategoryToRAG,
  };
};
