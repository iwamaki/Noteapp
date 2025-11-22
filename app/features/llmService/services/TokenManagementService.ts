/**
 * @file TokenManagementService.ts
 * @summary トークン使用量の追跡と自動要約トリガーを管理するサービス
 * @responsibility トークン使用量の保持、更新、通知、および100%超過時の自動要約トリガーを担当
 */

import { TokenUsageInfo } from '../types/index';
import { logger } from '../../../utils/logger';

/**
 * トークン使用量変更通知コールバック型
 */
type TokenUsageChangeCallback = (tokenUsage: TokenUsageInfo | null) => void;

/**
 * 要約が必要な場合のコールバック型
 */
type SummarizationNeededCallback = () => Promise<void>;

/**
 * トークン使用量の追跡と自動要約トリガーを管理するサービスクラス
 */
export class TokenManagementService {
  private tokenUsage: TokenUsageInfo | null = null;
  private onTokenUsageChange: TokenUsageChangeCallback | null = null;
  private onSummarizationNeeded: SummarizationNeededCallback | null = null;

  /**
   * コンストラクタ
   * @param onChangeCallback トークン使用量変更時のコールバック（オプショナル）
   * @param onSummarizationNeededCallback 要約が必要になった時のコールバック（オプショナル）
   */
  constructor(
    onChangeCallback?: TokenUsageChangeCallback,
    onSummarizationNeededCallback?: SummarizationNeededCallback
  ) {
    this.onTokenUsageChange = onChangeCallback || null;
    this.onSummarizationNeeded = onSummarizationNeededCallback || null;
  }

  /**
   * トークン使用量情報を更新
   * 100%を超えた場合は自動要約をトリガーする
   * @param tokenUsage 新しいトークン使用量情報
   */
  public updateTokenUsage(tokenUsage: TokenUsageInfo): void {
    this.tokenUsage = tokenUsage;
    this.notifyChange();
    logger.debug('TokenManagementService', 'Token usage updated:', tokenUsage);

    // 100%を超えたら自動的に要約を実行
    if (tokenUsage.usageRatio >= 1.0) {
      logger.info('TokenManagementService', 'Token usage exceeded 100%, starting automatic summarization');
      if (this.onSummarizationNeeded) {
        // 非同期で要約を実行（メッセージ送信処理をブロックしない）
        // setLoadingをfalseにした後に要約を開始する必要があるため、遅延実行
        setTimeout(async () => {
          await this.onSummarizationNeeded!();
        }, 100);
      }
    }
  }

  /**
   * 現在のトークン使用量情報を取得
   */
  public getTokenUsage(): TokenUsageInfo | null {
    return this.tokenUsage;
  }

  /**
   * トークン使用量情報をリセット
   * チャットリセット時や要約完了後に呼び出される
   */
  public resetTokenUsage(): void {
    this.tokenUsage = null;
    this.notifyChange();
  }

  /**
   * トークン使用量変更を通知
   */
  private notifyChange(): void {
    if (this.onTokenUsageChange) {
      this.onTokenUsageChange(this.tokenUsage);
    }
  }
}
