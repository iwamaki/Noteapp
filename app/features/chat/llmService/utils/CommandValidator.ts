import { LLMCommand } from '../types/index';
import { LLMError } from '../types/LLMError';
import ToolService from '../../services/ToolService';

/**
 * コマンド検証ユーティリティ
 * ToolServiceから取得したツール定義に基づいて、コマンドの検証を行います
 */
export class CommandValidator {
  /**
   * コマンドを検証
   * - アクション名の妥当性
   * - 引数のスキーマ準拠性
   * - パスの安全性
   */
  static validate(command: LLMCommand): void {
    // 1. アクション名のチェック
    if (!command.action) {
      throw new LLMError('アクションが指定されていません', 'MISSING_ACTION');
    }

    // 2. ToolServiceを使ったアクション名の検証
    if (!ToolService.isValidAction(command.action)) {
      throw new LLMError(
        `許可されていないアクション: ${command.action}`,
        'INVALID_ACTION'
      );
    }

    // 3. 引数のスキーマベース検証
    const validationErrors = ToolService.validateCommandArgs(command);
    if (validationErrors.length > 0) {
      throw new LLMError(
        `コマンド引数が不正です: ${validationErrors.join(', ')}`,
        'INVALID_ARGUMENTS'
      );
    }

    // 4. パスの安全性をチェック（既存の機能を維持）
    const paths = [command.path, command.source, command.destination].filter(Boolean);
    for (const path of paths) {
      this.validatePath(path!);
    }

    // 5. バッチ操作のパス配列をチェック
    if (command.paths || command.sources) {
      const pathArray = command.paths || command.sources;
      if (!Array.isArray(pathArray)) {
        throw new LLMError('バッチ操作のパスは配列である必要があります', 'INVALID_BATCH_PATHS');
      }
      pathArray.forEach(this.validatePath);
    }
  }

  /**
   * パスの安全性を検証
   * - 文字列型であること
   * - ディレクトリトラバーサル（..）を含まないこと
   */
  private static validatePath(path: string): void {
    if (typeof path !== 'string' || path.includes('..')) {
      throw new LLMError(`不正なパス: ${path}`, 'INVALID_PATH');
    }
  }
}
