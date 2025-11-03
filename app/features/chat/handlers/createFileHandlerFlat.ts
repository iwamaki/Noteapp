/**
 * @file createFileHandlerFlat.ts
 * @summary create_fileコマンドのハンドラ（フラット構造版）
 * @responsibility LLMからのファイル作成コマンドを処理します
 */

import { LLMCommand } from '../llmService/types/types';
import { CommandHandler } from './types';
import { logger } from '../../../utils/logger';
import { FileRepository } from '@data/repositories/fileRepository';
import { UnifiedErrorHandler } from '../utils/errorHandler';

/**
 * create_fileコマンドのハンドラ（フラット構造版）
 *
 * LLMから受け取ったファイル作成コマンドを処理します。
 * フラット構造では、titleのみでファイルを識別（パス不要）。
 *
 * @param command create_fileコマンド
 *   - title: ファイル名
 *   - content: ファイルの内容（オプション）
 *   - category: カテゴリーパス（オプション）
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
      category: typeof command.category === 'string' ? command.category : '',
      tags: Array.isArray(command.tags) ? command.tags : [],
    });

    logger.info('chatService', `File created successfully: ${newFile.title} (ID: ${newFile.id})`);

    // UIを更新
    if (context?.refreshData) {
      await context.refreshData();
      logger.debug('chatService', 'UI refreshed after file creation');
    }
  } catch (error) {
    UnifiedErrorHandler.handleCommandError(
      {
        location: 'createFileHandler',
        operation: 'ファイルの作成',
        metadata: { title: command.title },
      },
      'ファイルの作成',
      error
    );
  }
};
