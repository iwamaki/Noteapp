/**
 * @file moveItemHandler.ts
 * @summary move_itemコマンドのハンドラ
 * @responsibility LLMからのアイテム移動コマンドを処理します
 */

import { LLMCommand } from '../llmService/types/types';
import { CommandHandler } from './types';
import { logger } from '../../../utils/logger';

/**
 * move_itemコマンドのハンドラ
 *
 * LLMから受け取ったアイテム移動リクエストを処理します。
 * 現在は簡易実装で、実際のUIでの移動ロジックと統合が必要です。
 *
 * @param command move_itemコマンド
 * @param context コンテキスト（オプション）
 */
export const moveItemHandler: CommandHandler = async (command: LLMCommand, context?) => {
  logger.debug('moveItemHandler', 'Handling move_item command', {
    source: command.source,
    destination: command.destination,
  });

  try {
    // TODO: 実際の移動ロジックを実装
    // パスから対象を特定して移動
    logger.debug(
      'moveItemHandler',
      `Move not fully implemented: ${command.source} -> ${command.destination}`
    );

    // 将来的には以下のような実装が必要:
    // const storage = context?.noteListStorage || NoteListStorage;
    // await storage.moveItem(command.source, command.destination);
  } catch (error) {
    logger.error('moveItemHandler', 'Error moving item', error);
    throw error;
  }
};
