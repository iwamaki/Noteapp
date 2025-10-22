/**
 * @file moveItemHandler.ts
 * @summary move_itemコマンドのハンドラ
 * @responsibility LLMからのアイテム移動コマンドを処理します
 */

import { LLMCommand } from '../llmService/types/types';
import { CommandHandler } from './types';
import { logger } from '../../../utils/logger';
import { FileListStorage, StorageError } from '../../../screen/file-list/fileStorage';
import { PathService } from '../../../services/PathService';
import { findItemByPath, isValidDirectoryPath } from './itemResolver';

/**
 * move_itemコマンドのハンドラ
 *
 * LLMから受け取ったアイテム移動リクエストを処理します。
 * パスからアイテムを特定し、指定された移動先ディレクトリに移動します。
 *
 * @param command move_itemコマンド（command.source_path: 移動元, command.dest_path: 移動先）
 * @param context コンテキスト（オプション）
 */
export const moveItemHandler: CommandHandler = async (command: LLMCommand, context?) => {
  logger.info('moveItemHandler', 'Handling move_item command', {
    source: command.source_path,
    destination: command.dest_path,
  });

  // パラメータの検証
  if (!command.source_path || typeof command.source_path !== 'string') {
    logger.error('moveItemHandler', 'Invalid source_path parameter', {
      source_path: command.source_path,
    });
    throw new Error('移動元のパスが指定されていません');
  }

  if (!command.dest_path || typeof command.dest_path !== 'string') {
    logger.error('moveItemHandler', 'Invalid dest_path parameter', {
      dest_path: command.dest_path,
    });
    throw new Error('移動先のパスが指定されていません');
  }

  try {
    // 移動元のアイテムを検索
    const resolvedItem = await findItemByPath(command.source_path);

    if (!resolvedItem) {
      const errorMsg = `移動元のアイテムが見つかりません: ${command.source_path}`;
      logger.error('moveItemHandler', errorMsg);
      throw new Error(errorMsg);
    }

    // 移動先のディレクトリパスを正規化
    const destPath = PathService.normalizePath(command.dest_path);

    // 移動先のディレクトリが存在するか確認
    const isValidDest = await isValidDirectoryPath(destPath);
    if (!isValidDest) {
      const errorMsg = `移動先のディレクトリが存在しません: ${command.dest_path}`;
      logger.error('moveItemHandler', errorMsg);
      throw new Error(errorMsg);
    }

    // FileListStorageを取得（コンテキストから、またはデフォルト）
    const storage = context?.fileListStorage || FileListStorage;

    // アイテムの種類に応じて移動
    if (resolvedItem.type === 'file') {
      logger.debug('moveItemHandler', 'Moving file', {
        noteId: resolvedItem.id,
        noteTitle: (resolvedItem.item as any).title,
        sourcePath: command.source_path,
        destPath,
      });

      await storage.moveFile(resolvedItem.id, destPath);

      logger.info('moveItemHandler', 'Note moved successfully', {
        noteId: resolvedItem.id,
        destPath,
      });
    } else if (resolvedItem.type === 'folder') {
      logger.debug('moveItemHandler', 'Moving folder', {
        folderId: resolvedItem.id,
        folderName: (resolvedItem.item as any).name,
        sourcePath: command.source_path,
        destPath,
      });

      // フォルダの移動はupdateFolderで実現
      // パスを更新すると、子要素も自動的に更新される
      await storage.updateFolder({
        id: resolvedItem.id,
        path: destPath,
      });

      logger.info('moveItemHandler', 'Folder moved successfully', {
        folderId: resolvedItem.id,
        destPath,
      });
    } else {
      throw new Error(`未知のアイテムタイプ: ${resolvedItem.type}`);
    }
  } catch (error) {
    if (error instanceof StorageError) {
      logger.error('moveItemHandler', 'Storage error during move', {
        source: command.source_path,
        destination: command.dest_path,
        errorCode: error.code,
        errorMessage: error.message,
      });
      throw new Error(`移動に失敗しました: ${error.message}`);
    }

    logger.error('moveItemHandler', 'Unexpected error during move', {
      source: command.source_path,
      destination: command.dest_path,
      error,
    });
    throw error;
  }
};
