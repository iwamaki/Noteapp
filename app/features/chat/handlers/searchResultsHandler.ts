/**
 * @file searchResultsHandler.ts
 * @summary 検索結果取得ハンドラー
 * @responsibility fetch_search_resultsリクエストの処理を担当
 */

import { logger } from '../../../utils/logger';
import { FileRepository } from '@data/repositories/fileRepository';
import { CHAT_CONFIG } from '../config/chatConfig';

/**
 * fetch_search_resultsリクエスト
 */
export interface FetchSearchResultsRequest {
  type: 'fetch_search_results';
  request_id: string;
  query: string;
  search_type: 'title' | 'content' | 'tag' | 'category';
}

/**
 * search_results_responseレスポンス
 */
export interface SearchResultsResponse {
  type: 'search_results_response';
  request_id: string;
  query: string;
  results: any[];
  error?: string;
}

/**
 * fetch_search_resultsリクエストを処理
 */
export async function handleFetchSearchResults(
  request: FetchSearchResultsRequest
): Promise<SearchResultsResponse> {
  const { request_id, query, search_type } = request;

  logger.info(
    'websocket',
    `Searching files: query=${query}, search_type=${search_type}, request_id=${request_id}`
  );

  try {
    // Expo FileSystemから全ファイルを取得
    const files = await FileRepository.getAll();
    let results: any[] = [];

    // 検索タイプに応じた検索処理
    const lowerQuery = query.toLowerCase();

    switch (search_type) {
      case 'title':
        // タイトル検索
        results = files.filter((file) => file.title?.toLowerCase().includes(lowerQuery));
        break;

      case 'content':
        // 内容検索（マッチしたスニペットも含める）
        results = files
          .filter((file) => file.content?.toLowerCase().includes(lowerQuery))
          .map((file) => {
            // マッチした部分のスニペットを抽出（前後50文字）
            const content = file.content || '';
            const lowerContent = content.toLowerCase();
            const matchIndex = lowerContent.indexOf(lowerQuery);

            let snippet = '';
            if (matchIndex !== -1) {
              const contextLength = CHAT_CONFIG.search.snippetContextLength;
              const start = Math.max(0, matchIndex - contextLength);
              const end = Math.min(
                content.length,
                matchIndex + query.length + contextLength
              );
              snippet =
                (start > 0 ? '...' : '') +
                content.substring(start, end) +
                (end < content.length ? '...' : '');
            }

            return {
              ...file,
              match_snippet: snippet,
            };
          });
        break;

      case 'tag':
        // タグ検索
        results = files.filter((file) =>
          file.tags?.some((tag: string) => tag.toLowerCase().includes(lowerQuery))
        );
        break;

      case 'category':
        // カテゴリー検索
        results = files.filter((file) => file.category?.toLowerCase().includes(lowerQuery));
        break;

      default:
        logger.warn('websocket', `Unknown search_type: ${search_type}`);
        results = [];
    }

    // 検索結果を返す（必要な情報だけに絞る）
    const resultData = results.map((file) => ({
      title: file.title,
      category: file.category,
      tags: file.tags,
      match_snippet: file.match_snippet, // content検索の場合のみ
    }));

    logger.info(
      'websocket',
      `Search results sent: query=${query}, results_count=${results.length}`
    );

    return {
      type: 'search_results_response',
      request_id,
      query,
      results: resultData,
    };
  } catch (error) {
    logger.error('websocket', `Failed to search files: ${query}`, error);

    // エラーレスポンス
    return {
      type: 'search_results_response',
      request_id,
      query,
      results: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
