/**
 * @file deleteItemHandler.ts
 * @summary delete_itemコマンドのハンドラ
 * @responsibility LLMからのアイテム削除コマンドを処理します
 */

import { LLMCommand } from '../llmService/types/types';
import { CommandHandler } from './types';
import { logger } from '../../../utils/logger';
import { FileRepository, StorageError } from '@data/fileRepository';
import { FolderRepository } from '@data/folderRepository';
import { findItemByPath } from './itemResolver';

/**
 * delete_itemコマンドのハンドラ
 *
 * LLMから受け取ったアイテム削除リクエストを処理します。
 * パスからアイテムを特定し、ファイルまたはフォルダを削除します。
 *
 * @param command delete_itemコマンド（command.path: 削除対象のパス）
 */
export const deleteItemHandler: CommandHandler = async (command: LLMCommand) => {
  logger.info('deleteItemHandler', 'Handling delete_item command', {
    path: command.path,
  });

  // パスの検証
  if (!command.path || typeof command.path !== 'string') {
    logger.error('deleteItemHandler', 'Invalid path parameter', { path: command.path });
    throw new Error('削除するアイテムのパスが指定されていません');
  }

  try {
    // パスからアイテムを検索
    const resolvedItem = await findItemByPath(command.path);

    if (!resolvedItem) {
      const errorMsg = `アイテムが見つかりません: ${command.path}`;
      logger.error('deleteItemHandler', errorMsg);
      throw new Error(errorMsg);
    }

    // アイテムの種類に応じて削除
    if (resolvedItem.type === 'file') {
      logger.debug('deleteItemHandler', 'Deleting file', {
        fileId: resolvedItem.id,
        fileTitle: (resolvedItem.item as any).title,
      });
      await FileRepository.batchDelete([resolvedItem.id]);
      logger.info('deleteItemHandler', 'File deleted successfully', {
        fileId: resolvedItem.id,
      });
    } else if (resolvedItem.type === 'folder') {
      logger.debug('deleteItemHandler', 'Deleting folder and its contents', {
        folderId: resolvedItem.id,
        folderName: (resolvedItem.item as any).name,
      });
      // deleteContents = true で中身ごと削除
      await FolderRepository.delete(resolvedItem.id, true);
      logger.info('deleteItemHandler', 'Folder deleted successfully', {
        folderId: resolvedItem.id,
      });
    } else {
      throw new Error(`未知のアイテムタイプ: ${resolvedItem.type}`);
    }
  } catch (error) {
    if (error instanceof StorageError) {
      logger.error('deleteItemHandler', 'Storage error during deletion', {
        path: command.path,
        errorCode: error.code,
        errorMessage: error.message,
      });
      throw new Error(`削除に失敗しました: ${error.message}`);
    }

    logger.error('deleteItemHandler', 'Unexpected error during deletion', {
      path: command.path,
      error,
    });
    throw error;
  }
};
