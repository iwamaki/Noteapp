/**
 * @file moveItemHandlerV2.ts
 * @summary move_itemコマンドのハンドラ（V2構造対応）
 * @responsibility LLMからのアイテム移動コマンドを処理します
 *
 * V1との主な違い:
 * - ❌ 全件取得パターンの削除 → ✅ DirectoryResolverを活用
 * - ❌ 手動パス更新 → ✅ リポジトリのmove()が子孫も自動移動
 * - ✅ 超簡単！
 */

import { LLMCommand } from '../llmService/types/types';
import { CommandHandler, CommandHandlerContext } from './types';
import { logger } from '../../../utils/logger';
import { FileRepositoryV2 } from '@data/repositories/fileRepositoryV2';
import { FolderRepositoryV2 } from '@data/repositories/folderRepositoryV2';
import { PathServiceV2 } from '../../../services/PathServiceV2';
import {
  findItemByPathV2,
  isValidDirectoryPathV2,
} from './itemResolverV2';

/**
 * move_itemコマンドのハンドラ（V2）
 *
 * LLMから受け取ったアイテム移動リクエストを処理します。
 * パスからアイテムを特定し、指定された移動先ディレクトリに移動します。
 *
 * V1との違い:
 * - DirectoryResolverで効率的にアイテムを検索
 * - リポジトリのmove()が子孫も自動移動（複雑なパス更新不要！）
 *
 * @param command move_itemコマンド（command.source_path: 移動元, command.dest_path: 移動先）
 * @param context コマンドハンドラのコンテキスト
 */
export const moveItemHandlerV2: CommandHandler = async (
  command: LLMCommand,
  context?: CommandHandlerContext
) => {
  logger.info('moveItemHandler', 'Handling move_item command (V2)', {
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
    // 移動元のアイテムを検索（DirectoryResolverで効率的！）
    const resolvedItem = await findItemByPathV2(command.source_path);

    if (!resolvedItem) {
      const errorMsg = `移動元のアイテムが見つかりません: ${command.source_path}`;
      logger.error('moveItemHandler', errorMsg);
      throw new Error(errorMsg);
    }

    // 移動先のディレクトリパスを正規化
    const destPath = PathServiceV2.normalizePath(command.dest_path);

    // 移動先のディレクトリが存在するか確認（DirectoryResolverで効率的！）
    const isValidDest = await isValidDirectoryPathV2(destPath);
    if (!isValidDest) {
      const errorMsg = `移動先のディレクトリが存在しません: ${command.dest_path}`;
      logger.error('moveItemHandler', errorMsg);
      throw new Error(errorMsg);
    }

    // アイテムの種類に応じて移動（リポジトリのmove()が子孫も自動移動！）
    if (resolvedItem.type === 'file') {
      logger.debug('moveItemHandler', 'Moving file (V2)', {
        fileId: resolvedItem.id,
        fileTitle: (resolvedItem.item as any).title,
        sourcePath: command.source_path,
        destPath,
      });

      await FileRepositoryV2.move(resolvedItem.id, destPath);

      logger.info('moveItemHandler', 'File moved successfully (V2)', {
        fileId: resolvedItem.id,
        destPath,
      });
    } else if (resolvedItem.type === 'folder') {
      logger.debug('moveItemHandler', 'Moving folder (V2)', {
        folderId: resolvedItem.id,
        folderName: (resolvedItem.item as any).name,
        sourcePath: command.source_path,
        destPath,
      });

      // フォルダの移動（リポジトリのmove()が子孫も自動移動！超簡単！）
      await FolderRepositoryV2.move(resolvedItem.id, destPath);

      logger.info('moveItemHandler', 'Folder moved successfully (V2)', {
        folderId: resolvedItem.id,
        destPath,
      });
    } else {
      throw new Error(`未知のアイテムタイプ: ${resolvedItem.type}`);
    }

    // FileListScreenの画面更新をトリガー
    if (context?.refreshData) {
      logger.debug('moveItemHandler', 'Refreshing FileList data after move');
      await context.refreshData();
    }
  } catch (error) {
    logger.error('moveItemHandler', 'Error during move (V2)', {
      source: command.source_path,
      destination: command.dest_path,
      error,
    });
    throw error instanceof Error ? error : new Error('移動に失敗しました');
  }
};
