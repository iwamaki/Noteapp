/**
 * @file types.ts
 * @summary 後方互換性のための型定義re-export
 * @deprecated 新しいコードでは './types/index' または個別の型ファイルからimportしてください
 *
 * このファイルは既存コードとの互換性のために残されています。
 * 全ての型定義は責務別に分割されたファイルに移動されました：
 * - message.types.ts: ChatMessage
 * - context.types.ts: ChatContext
 * - command.types.ts: LLMCommand, LLMResponse
 * - provider.types.ts: LLMProvider, LLMHealthStatus
 * - config.types.ts: TokenUsageInfo, LLMConfig
 * - summarization.types.ts: SummarizeRequest, SummarizeResponse, SummaryResult
 */

// 全ての型をindex.tsからre-export
export type {
  ChatMessage,
  ChatContext,
  LLMCommand,
  LLMResponse,
  LLMProvider,
  LLMHealthStatus,
  TokenUsageInfo,
  LLMConfig,
  SummarizeRequest,
  SummarizeResponse,
  SummaryResult,
} from './index';
