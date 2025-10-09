import { LLMCommand } from '../types/types';
import { LLMError } from '../types/LLMError';

/**
 * コマンド検証ユーティリティ
 */
export class CommandValidator {
  private static readonly ALLOWED_ACTIONS = [
    'create_file', 'create_directory', 'delete_file', 'copy_file', 'move_file',
    'read_file', 'edit_file', 'list_files',
    'batch_delete', 'batch_copy', 'batch_move'
  ] as const;

  static validate(command: LLMCommand): void {
    if (!command.action) {
      throw new LLMError('アクションが指定されていません', 'MISSING_ACTION');
    }

    if (!this.ALLOWED_ACTIONS.includes(command.action as any)) {
      throw new LLMError(`許可されていないアクション: ${command.action}`, 'INVALID_ACTION');
    }

    // パスの安全性をチェック
    const paths = [command.path, command.source, command.destination].filter(Boolean);
    for (const path of paths) {
      this.validatePath(path!);
    }

    // バッチ操作のパス配列をチェック
    if (command.paths || command.sources) {
      const pathArray = command.paths || command.sources;
      if (!Array.isArray(pathArray)) {
        throw new LLMError('バッチ操作のパスは配列である必要があります', 'INVALID_BATCH_PATHS');
      }
      pathArray.forEach(this.validatePath);
    }
  }

  private static validatePath(path: string): void {
    if (typeof path !== 'string' || path.includes('..')) {
      throw new LLMError(`不正なパス: ${path}`, 'INVALID_PATH');
    }
  }
}
