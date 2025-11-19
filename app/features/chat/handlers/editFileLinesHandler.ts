/**
 * @file editFileLinesHandler.ts
 * @summary edit_file_linesコマンドのハンドラ
 * @responsibility LLMからのファイルの部分編集コマンドを処理します
 */

import { FileRepository } from '@data/repositories/fileRepository';
import type { FileFlat } from '@data/core/typesFlat';
import { LLMCommand } from '../../llmService/types/index';
import { CommandHandler } from './types';
import { logger } from '../../../utils/logger';
import { UnifiedErrorHandler } from '../utils/errorHandler';

/**
 * edit_file_linesコマンドのハンドラ
 *
 * LLMから受け取ったファイルの特定行範囲の編集を実行します。
 * ファイル全体ではなく、指定された行のみを更新することで、
 * トークン消費を削減し、大きなファイルの部分編集を効率化します。
 *
 * @param command edit_file_linesコマンド
 * @param context setContent, refreshData関数を含むコンテキスト
 */
export const editFileLinesHandler: CommandHandler = async (
  command: LLMCommand,
  context?
) => {
  logger.debug('toolService', 'Handling edit_file_lines command', {
    title: command.title,
    startLine: command.start_line,
    endLine: command.end_line,
    hasContent: !!command.content,
  });

  try {
    // バリデーション
    if (!command.title) {
      throw new Error('ファイル名が指定されていません');
    }

    const startLine = command.start_line;
    const endLine = command.end_line;
    const newContent = command.content || '';

    if (startLine === undefined || endLine === undefined) {
      throw new Error('start_lineとend_lineが必要です');
    }

    if (startLine < 1 || endLine < 1 || startLine > endLine) {
      throw new Error('無効な行番号範囲です');
    }

    // 既存のファイルを検索
    logger.debug('toolService', 'Searching for file', { title: command.title });
    const allFiles = await FileRepository.getAll();
    const targetFile = allFiles.find((f: FileFlat) => f.title === command.title);

    if (!targetFile) {
      throw new Error(`ファイル「${command.title}」が見つかりません`);
    }

    // 行ベースの更新を実行
    logger.debug('toolService', 'Updating file lines', {
      fileId: targetFile.id,
      startLine,
      endLine,
    });
    const updatedFile = await FileRepository.updateLines(
      targetFile.id,
      startLine,
      endLine,
      newContent
    );

    logger.info('toolService', 'File lines updated successfully', {
      fileId: targetFile.id,
      title: updatedFile.title,
      linesAffected: endLine - startLine + 1,
    });

    // UIを更新
    // 編集画面の場合、エディタの内容も更新
    if (context?.setContent) {
      context.setContent(updatedFile.content);
      logger.debug('toolService', 'Editor content updated');
    }

    // ファイルリスト画面の場合、リストを再読み込み
    if (context?.refreshData) {
      await context.refreshData();
      logger.debug('toolService', 'File list refreshed');
    }
  } catch (error) {
    UnifiedErrorHandler.handleCommandError(
      {
        location: 'editFileLinesHandler',
        operation: 'ファイルの部分編集',
        metadata: {
          title: command.title,
          startLine: command.start_line,
          endLine: command.end_line,
        },
      },
      'ファイルの部分編集',
      error
    );
  }
};
