/**
 * @file deleteItemHandlerV2.ts
 * @summary delete_itemコマンドのハンドラ（V2構造対応）
 * @responsibility LLMからのアイテム削除コマンドを処理します
 *
 * V1との主な違い:
 * - ❌ 全件取得パターンの削除 → ✅ DirectoryResolverを活用
 * - ❌ 複雑な階層走査 → ✅ ディレクトリ削除で子孫も自動削除
 * - ✅ 超簡単！
 */

import { LLMCommand } from '../llmService/types/types';
import { CommandHandler, CommandHandlerContext } from './types';
import { logger } from '../../../utils/logger';
import { FileRepositoryV2 } from '@data/fileRepositoryV2';
import { FolderRepositoryV2 } from '@data/folderRepositoryV2';
import { findItemByPathV2 } from './itemResolverV2';

/**
 * delete_itemコマンドのハンドラ（V2）
 *
 * LLMから受け取ったアイテム削除リクエストを処理します。
 * パスからアイテムを特定し、ファイルまたはフォルダを削除します。
 *
 * V1との違い:
 * - DirectoryResolverで効率的にアイテムを検索
 * - ディレクトリ削除で子孫も自動削除（複雑な階層走査不要！）
 *
 * @param command delete_itemコマンド（command.path: 削除対象のパス）
 * @param context コマンドハンドラのコンテキスト
 */
export const deleteItemHandlerV2: CommandHandler = async (
  command: LLMCommand,
  context?: CommandHandlerContext
) => {
  logger.info('deleteItemHandler', 'Handling delete_item command (V2)', {
    path: command.path,
  });

  // パスの検証
  if (!command.path || typeof command.path !== 'string') {
    logger.error('deleteItemHandler', 'Invalid path parameter', {
      path: command.path,
    });
    throw new Error('削除するアイテムのパスが指定されていません');
  }

  try {
    // パスからアイテムを検索（DirectoryResolverで効率的！）
    const resolvedItem = await findItemByPathV2(command.path);

    if (!resolvedItem) {
      const errorMsg = `アイテムが見つかりません: ${command.path}`;
      logger.error('deleteItemHandler', errorMsg);
      throw new Error(errorMsg);
    }

    // アイテムの種類に応じて削除
    if (resolvedItem.type === 'file') {
      logger.debug('deleteItemHandler', 'Deleting file (V2)', {
        fileId: resolvedItem.id,
        fileTitle: (resolvedItem.item as any).title,
      });

      await FileRepositoryV2.delete(resolvedItem.id);

      logger.info('deleteItemHandler', 'File deleted successfully (V2)', {
        fileId: resolvedItem.id,
      });
    } else if (resolvedItem.type === 'folder') {
      logger.debug('deleteItemHandler', 'Deleting folder and its contents (V2)', {
        folderId: resolvedItem.id,
        folderName: (resolvedItem.item as any).name,
      });

      // フォルダ削除（ディレクトリ削除で子孫も自動削除！超簡単！）
      await FolderRepositoryV2.delete(resolvedItem.id);

      logger.info('deleteItemHandler', 'Folder deleted successfully (V2)', {
        folderId: resolvedItem.id,
      });
    } else {
      throw new Error(`未知のアイテムタイプ: ${resolvedItem.type}`);
    }

    // FileListScreenの画面更新をトリガー
    if (context?.refreshData) {
      logger.debug('deleteItemHandler', 'Refreshing FileList data after deletion');
      await context.refreshData();
    }
  } catch (error) {
    logger.error('deleteItemHandler', 'Error during deletion (V2)', {
      path: command.path,
      error,
    });
    throw error instanceof Error ? error : new Error('削除に失敗しました');
  }
};
