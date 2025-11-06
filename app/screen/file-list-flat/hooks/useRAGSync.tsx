/**
 * @file useRAGSync.tsx
 * @summary RAG（知識ベース）同期機能を提供するフック
 * @description
 * カテゴリー配下のテキストデータをバックエンドのRAG（永久保存コレクション）に送信し、
 * Q&A機能のための知識ベースを構築します。
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { FileRepository } from '@data/repositories/fileRepository';
import { logger } from '../../../utils/logger';
import APIService from '../../../features/chat/llmService/api';

/**
 * RAG同期機能を提供するフック
 */
export const useRAGSync = () => {
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
      const categoryFiles = allFiles.filter(file => {
        // カテゴリーが完全一致、または指定されたカテゴリーで始まる（サブカテゴリーを含む）
        return file.category === categoryPath || file.category.startsWith(categoryPath + '/');
      });

      if (categoryFiles.length === 0) {
        Alert.alert('Q&A作成', 'このカテゴリーにファイルがありません');
        logger.warn('rag', `No files found in category: ${categoryPath}`);
        return;
      }

      logger.info('rag', `Found ${categoryFiles.length} files in category ${categoryPath}`);

      // 各ファイルのテキストを結合（区切り付き）
      const combinedText = categoryFiles
        .map(file => {
          // ファイルごとに区切り線とメタデータを追加
          const separator = '='.repeat(60);
          const header = `${separator}\nタイトル: ${file.title}\nカテゴリー: ${file.category || '未分類'}\n${separator}\n\n`;
          return header + file.content;
        })
        .join('\n\n');

      logger.debug('rag', `Combined text length: ${combinedText.length} characters`);

      // バックエンドのRAGにアップロード（永久保存コレクション "default" を使用）
      const result = await APIService.uploadTextToKnowledgeBase(
        combinedText,
        'default', // 永久保存コレクション
        `カテゴリー: ${categoryName}`, // メタデータのタイトル
        `${categoryFiles.length}個のファイルを含むカテゴリー` // メタデータの説明
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
          'Q&A作成完了',
          `カテゴリー「${categoryName}」のファイル（${categoryFiles.length}件）を知識ベースに追加しました。\n\n` +
          `チャットで質問することで、このカテゴリーの内容に基づいた回答が得られます。\n\n` +
          `作成されたチャンク数: ${result.document?.chunks_created}\n` +
          `総文字数: ${result.document?.total_characters}`,
          [{ text: 'OK' }]
        );
      } else {
        throw new Error('RAG sync failed: ' + result.message);
      }
    } catch (error: any) {
      logger.error('rag', `RAG sync failed: ${error.message}`, error);
      Alert.alert(
        'エラー',
        `Q&A作成に失敗しました。\n\n${error.message || 'ネットワークエラーが発生しました。'}`
      );
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return {
    isSyncing,
    syncCategoryToRAG,
  };
};
