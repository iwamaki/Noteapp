/**
 * @file chatAttachmentService.ts
 * @summary チャットへのファイル添付機能を管理するサービス
 * @responsibility ファイルの添付、削除、一覧取得を担当し、ChatServiceから分離
 */

import { FileRepository } from '@data/repositories/fileRepository';
import { logger } from '../../../utils/logger';

/**
 * 添付ファイルの変更を通知するコールバック型
 */
type AttachedFileChangeCallback = (files: Array<{ filename: string; content: string }>) => void;

/**
 * チャットへのファイル添付機能を管理するサービスクラス
 */
export class ChatAttachmentService {
  private attachedFiles: Array<{ filename: string; content: string }> = [];
  private onAttachedFileChange: AttachedFileChangeCallback | null = null;

  /**
   * コンストラクタ
   * @param onChangeCallback 添付ファイル変更時のコールバック（オプショナル）
   */
  constructor(onChangeCallback?: AttachedFileChangeCallback) {
    this.onAttachedFileChange = onChangeCallback || null;
  }

  /**
   * ファイルをチャットに添付
   * @param fileId 添付するファイルのID
   */
  public async attachFile(fileId: string): Promise<void> {
    try {
      const file = await FileRepository.getById(fileId);
      if (!file) {
        logger.error('chatService', `File not found: ${fileId}`);
        return;
      }

      // 既に添付されている場合は追加しない
      const alreadyAttached = this.attachedFiles.some(f => f.filename === file.title);
      if (alreadyAttached) {
        logger.warn('chatService', `File already attached: ${file.title}`);
        return;
      }

      this.attachedFiles.push({
        filename: file.title,
        content: file.content,
      });

      logger.info('chatService', `File attached: ${file.title} (total: ${this.attachedFiles.length})`);
      this.notifyChange();
    } catch (error) {
      logger.error('chatService', 'Error attaching file:', error);
    }
  }

  /**
   * 添付ファイルをすべてクリア
   */
  public clearAttachedFiles(): void {
    this.attachedFiles = [];
    logger.info('chatService', 'All attached files cleared');
    this.notifyChange();
  }

  /**
   * 指定したインデックスの添付ファイルを削除
   * @param index 削除するファイルのインデックス
   */
  public removeAttachedFile(index: number): void {
    if (index >= 0 && index < this.attachedFiles.length) {
      const removed = this.attachedFiles.splice(index, 1)[0];
      logger.info('chatService', `Attached file removed: ${removed.filename} (remaining: ${this.attachedFiles.length})`);
      this.notifyChange();
    }
  }

  /**
   * 現在の添付ファイル一覧を取得
   */
  public getAttachedFiles(): Array<{ filename: string; content: string }> {
    return [...this.attachedFiles];
  }

  /**
   * 添付ファイルの変更を通知
   */
  private notifyChange(): void {
    if (this.onAttachedFileChange) {
      // 新しい配列を作成して渡す（参照を変えることでReactの再レンダリングをトリガー）
      this.onAttachedFileChange([...this.attachedFiles]);
    }
  }
}
