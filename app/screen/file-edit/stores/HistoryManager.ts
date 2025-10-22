/**
 * @file stores/HistoryManager.ts
 * @summary コンテンツ編集履歴の管理
 * @description Undo/Redo機能のための履歴管理ロジック
 */

/**
 * 履歴管理クラス
 * Undo/Redoのための編集履歴を管理
 */
export class HistoryManager {
  private past: string[] = [];
  private present: string = '';
  private future: string[] = [];
  private maxHistorySize = 100;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private debounceDelay = 300;

  /**
   * 履歴をリセットして新しい初期コンテンツを設定
   */
  reset(initialContent: string): void {
    this.past = [];
    this.present = initialContent;
    this.future = [];
    this.clearDebounce();
  }

  /**
   * 新しいコンテンツを履歴に追加（デバウンス付き）
   */
  push(content: string): void {
    this.clearDebounce();

    this.debounceTimer = setTimeout(() => {
      this.addToHistory(content);
    }, this.debounceDelay);
  }

  /**
   * 履歴に追加（内部メソッド）
   */
  private addToHistory(content: string): void {
    if (content === this.present) {
      return;
    }

    // 現在の状態を過去に追加
    this.past.push(this.present);

    // サイズ制限
    if (this.past.length > this.maxHistorySize) {
      this.past.shift();
    }

    // 現在の状態を更新
    this.present = content;

    // 未来をクリア（新しい分岐）
    this.future = [];
  }

  /**
   * Undo操作を実行
   */
  undo(): string | null {
    if (this.past.length === 0) {
      return null;
    }

    const previous = this.past.pop()!;
    this.future.unshift(this.present);
    this.present = previous;

    return this.present;
  }

  /**
   * Redo操作を実行
   */
  redo(): string | null {
    if (this.future.length === 0) {
      return null;
    }

    const next = this.future.shift()!;
    this.past.push(this.present);
    this.present = next;

    return this.present;
  }

  /**
   * Undoが可能かチェック
   */
  canUndo(): boolean {
    return this.past.length > 0;
  }

  /**
   * Redoが可能かチェック
   */
  canRedo(): boolean {
    return this.future.length > 0;
  }

  /**
   * 履歴をクリア
   */
  clear(): void {
    this.clearDebounce();
    this.past = [];
    this.present = '';
    this.future = [];
  }

  /**
   * デバウンスタイマーをクリア
   */
  private clearDebounce(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * 現在のコンテンツを取得
   */
  getPresent(): string {
    return this.present;
  }
}
