/**
 * @file createFileHandlerFlat.ts
 * @summary create_fileコマンドのハンドラ（フラット構造版）
 * @responsibility LLMからのファイル作成コマンドを処理します
 */

import { LLMCommand } from '../llmService/types/types';
import { CommandHandler } from './types';
import { logger } from '../../../utils/logger';
import { FileRepository } from '@data/repositories/fileRepository';

/**
 * create_fileコマンドのハンドラ（フラット構造版）
 *
 * LLMから受け取ったファイル作成コマンドを処理します。
 * フラット構造では、titleのみでファイルを識別（パス不要）。
 *
 * @param command create_fileコマンド
 *   - title: ファイル名
 *   - content: ファイルの内容（オプション）
 *   - categories: カテゴリー（オプション）
 *   - tags: タグ（オプション）
 * @param context refreshData関数を含むコンテキスト
 */
export const createFileHandlerFlat: CommandHandler = async (command: LLMCommand, context?) => {
  logger.debug('chatService', 'Handling create_file command (flat)', {
    title: command.title,
    hasContent: !!command.content,
  });

  // titleの検証
  if (!command.title || typeof command.title !== 'string') {
    logger.error('chatService', 'Invalid title in create_file command');
    throw new Error('ファイル名が指定されていません');
  }

  try {
    // ファイルを作成
    const newFile = await FileRepository.create({
      title: command.title,
      content: typeof command.content === 'string' ? command.content : '',
      categories: Array.isArray(command.categories) ? command.categories : [],
      tags: Array.isArray(command.tags) ? command.tags : [],
    });

    logger.info('chatService', `File created successfully: ${newFile.title} (ID: ${newFile.id})`);

    // UIを更新
    if (context?.refreshData) {
      await context.refreshData();
      logger.debug('chatService', 'UI refreshed after file creation');
    }
  } catch (error) {
    logger.error('chatService', 'Failed to create file:', error);
    throw new Error(`ファイルの作成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
  }
};
