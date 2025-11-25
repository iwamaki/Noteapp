/**
 * @file contextBuilder.ts
 * @summary チャットコンテキストを構築するためのユーティリティ関数
 * @responsibility ActiveScreenContextからChatContextを構築する責務を持つ
 */

import { ChatContext } from '../../llmService/types/context.types';
import { ActiveScreenContext } from '../types';
import { FileRepository } from '@data/repositories/fileRepository';
import { logger } from '../../../utils/logger';

/**
 * 画面コンテキストと設定情報からChatContextを構築
 *
 * @param screenContext アクティブな画面のコンテキスト
 * @param sendFileContextToLLM 全ファイル情報をLLMに送信するかどうか
 * @param attachedFiles 添付ファイルのリスト
 * @returns 構築されたChatContext
 */
export async function buildChatContext(
  screenContext: ActiveScreenContext | null,
  sendFileContextToLLM: boolean,
  attachedFiles: Array<{ filename: string; content: string }>
): Promise<ChatContext> {
  // sendFileContextToLLMがtrueの場合のみ全ファイル情報を取得
  const allFilesData = sendFileContextToLLM
    ? await getAllFilesForContext()
    : undefined;

  const chatContext: ChatContext = {
    activeScreen: screenContext ?? undefined,
    allFiles: allFilesData,
    sendFileContextToLLM,
    attachedFileContent: attachedFiles.length > 0 ? attachedFiles : undefined,
  };

  return chatContext;
}

/**
 * LLMコンテキスト用に全ファイル情報を取得（Flat構造版）
 * フラット構造: パス不要、titleのみでファイルを識別
 *
 * @returns ファイル情報の配列
 */
export async function getAllFilesForContext(): Promise<Array<{
  title: string;
  type: 'file';
  category?: string;
  tags?: string[];
}>> {
  try {
    const files = await FileRepository.getAll();
    return files.map(file => ({
      title: file.title,
      type: 'file' as const,
      category: file.category,
      tags: file.tags,
    }));
  } catch (error) {
    logger.error('contextBuilder', 'Error getting all files for context:', error);
    return [];
  }
}
