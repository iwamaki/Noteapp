/**
 * @file fileContentHandler.ts
 * @summary ファイル内容取得ハンドラー
 * @responsibility fetch_file_contentリクエストの処理を担当
 */

import { logger } from '../../../../../utils/logger';
import { FileRepository } from '@data/repositories/fileRepository';

/**
 * fetch_file_contentリクエスト
 */
export interface FetchFileContentRequest {
  type: 'fetch_file_content';
  request_id: string;
  title: string;
}

/**
 * file_content_responseレスポンス
 */
export interface FileContentResponse {
  type: 'file_content_response';
  request_id: string;
  title: string;
  content: string | null;
  error?: string;
}

/**
 * fetch_file_contentリクエストを処理
 */
export async function handleFetchFileContent(
  request: FetchFileContentRequest
): Promise<FileContentResponse> {
  const { request_id, title } = request;

  logger.info('websocket', `Fetching file content: title=${title}, request_id=${request_id}`);

  try {
    // Expo FileSystemからファイルを取得
    const files = await FileRepository.getAll();
    const file = files.find((f) => f.title === title);

    if (!file) {
      logger.warn('websocket', `File not found: ${title}`);

      // ファイルが見つからない場合
      return {
        type: 'file_content_response',
        request_id,
        title,
        content: null,
        error: `File '${title}' not found`,
      };
    }

    // ファイル内容を返す
    logger.info('websocket', `File content sent: title=${title}, length=${file.content?.length || 0}`);

    return {
      type: 'file_content_response',
      request_id,
      title,
      content: file.content || '',
    };
  } catch (error) {
    logger.error('websocket', `Failed to fetch file content: ${title}`, error);

    // エラーレスポンス
    return {
      type: 'file_content_response',
      request_id,
      title,
      content: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
