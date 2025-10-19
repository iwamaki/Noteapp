/**
 * @file AppInitializer.ts
 * @summary アプリケーション初期化マネージャー
 * @responsibility 初期化タスクの登録、依存関係の解決、実行順序の制御、
 *                 エラーハンドリングを行い、安全で効率的な初期化を実現します。
 */

import { useInitializationStore } from './InitializationStore';
import {
  InitializationTask,
  InitializationStage,
  TaskPriority,
  InitializationError,
  InitializerConfig,
} from './types';

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: Required<InitializerConfig> = {
  minSplashDuration: 1000, // 1秒
  enableDebugLogs: __DEV__,
  globalTimeout: 60000, // 60秒
  stopOnCriticalError: true,
  maxConcurrentTasks: 3,
};

/**
 * AppInitializerクラス
 * シングルトンパターンで実装
 */
export class AppInitializer {
  private static instance: AppInitializer | null = null;

  private tasks: Map<string, InitializationTask> = new Map();
  private config: Required<InitializerConfig>;
  private startTime: number = 0;

  private constructor(config?: InitializerConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(config?: InitializerConfig): AppInitializer {
    if (!AppInitializer.instance) {
      AppInitializer.instance = new AppInitializer(config);
    }
    return AppInitializer.instance;
  }

  /**
   * インスタンスをリセット（テスト用）
   */
  public static resetInstance(): void {
    AppInitializer.instance = null;
  }

  /**
   * タスクを登録
   */
  public registerTask(task: InitializationTask): void {
    if (this.tasks.has(task.id)) {
      this.log(`⚠️ Task ${task.id} is already registered. Overwriting.`);
    }
    this.tasks.set(task.id, task);
    this.log(`✅ Registered task: ${task.id} (${task.stage})`);
  }

  /**
   * 複数のタスクを一括登録
   */
  public registerTasks(tasks: InitializationTask[]): void {
    tasks.forEach((task) => this.registerTask(task));
  }

  /**
   * 初期化を実行
   */
  public async initialize(): Promise<void> {
    this.startTime = Date.now();
    const store = useInitializationStore.getState();

    try {
      this.log('🚀 Starting application initialization...');
      store.startInitialization();

      // ステージ順に実行
      const stages = [
        InitializationStage.CRITICAL,
        InitializationStage.CORE,
        InitializationStage.SERVICES,
        InitializationStage.READY,
      ];

      for (const stage of stages) {
        await this.executeStage(stage);

        // クリティカルエラーがあればここで中断
        if (this.config.stopOnCriticalError && this.hasCriticalErrors(stage)) {
          this.log(`❌ Critical error in stage ${stage}. Stopping initialization.`);
          store.failInitialization();
          throw new Error(`Critical initialization failure at stage: ${stage}`);
        }
      }

      // 最小スプラッシュ表示時間を保証
      await this.ensureMinimumSplashDuration();

      store.completeInitialization();
      const duration = Date.now() - this.startTime;
      this.log(`✅ Initialization completed in ${duration}ms`);
    } catch (error) {
      this.log(`❌ Initialization failed:`, error);
      store.failInitialization();
      throw error;
    }
  }

  /**
   * ステージを実行
   */
  private async executeStage(stage: InitializationStage): Promise<void> {
    const store = useInitializationStore.getState();
    const stageTasks = this.getTasksForStage(stage);

    if (stageTasks.length === 0) {
      this.log(`⚠️ No tasks registered for stage: ${stage}`);
      return;
    }

    this.log(`🔄 Starting stage: ${stage} (${stageTasks.length} tasks)`);
    store.startStage(stage);

    // タスクを登録
    stageTasks.forEach((task) => {
      store.registerTask(task.id, stage);
    });

    // 依存関係を解決して実行順序を決定
    const executionOrder = this.resolveExecutionOrder(stageTasks);

    // タスクを順次実行（並列実行も考慮）
    await this.executeTasks(executionOrder);

    store.completeStage(stage);
    this.log(`✅ Completed stage: ${stage}`);
  }

  /**
   * タスクを実行
   */
  private async executeTasks(tasks: InitializationTask[]): Promise<void> {

    // バッチサイズに分割して実行（並列実行制御）
    for (let i = 0; i < tasks.length; i += this.config.maxConcurrentTasks) {
      const batch = tasks.slice(i, i + this.config.maxConcurrentTasks);
      await Promise.all(batch.map((task) => this.executeTask(task)));
    }
  }

  /**
   * 単一タスクを実行
   */
  private async executeTask(task: InitializationTask): Promise<void> {
    const store = useInitializationStore.getState();
    const timeout = task.timeout || this.config.globalTimeout;
    const maxAttempts = task.retry?.maxAttempts || 1;

    this.log(`▶️ Executing task: ${task.id} (${task.name})`);
    store.startTask(task.id, task.name);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // タイムアウト付きで実行
        await this.executeWithTimeout(task.execute, timeout);

        // 成功
        store.completeTask(task.id);
        this.log(`✅ Task completed: ${task.id}`);
        return;
      } catch (error) {
        this.log(`❌ Task failed (attempt ${attempt}/${maxAttempts}): ${task.id}`, error);

        // 最後の試行なら、エラーを処理
        if (attempt === maxAttempts) {
          await this.handleTaskFailure(task, error, attempt);
          return;
        }

        // リトライ待機
        if (task.retry) {
          const delay = this.calculateRetryDelay(task.retry.delayMs, attempt, task.retry.exponentialBackoff);
          this.log(`⏳ Retrying task ${task.id} in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }
  }

  /**
   * タスク失敗時の処理
   */
  private async handleTaskFailure(
    task: InitializationTask,
    error: unknown,
    retryCount: number
  ): Promise<void> {
    const store = useInitializationStore.getState();

    const initError: InitializationError = {
      taskId: task.id,
      taskName: task.name,
      message: error instanceof Error ? error.message : String(error),
      error,
      timestamp: new Date(),
      retryCount,
      stack: error instanceof Error ? error.stack : undefined,
    };

    // フォールバック関数があれば実行
    if (task.fallback) {
      try {
        this.log(`🔄 Running fallback for task: ${task.id}`);
        await task.fallback(error instanceof Error ? error : new Error(String(error)));
        store.completeTask(task.id);
        this.log(`✅ Fallback succeeded for task: ${task.id}`);
        return;
      } catch (fallbackError) {
        this.log(`❌ Fallback failed for task: ${task.id}`, fallbackError);
      }
    }

    // タスクを失敗としてマーク
    store.failTask(task.id, initError);

    // クリティカル優先度の場合は例外をスロー
    if (task.priority === TaskPriority.CRITICAL) {
      throw error;
    }
  }

  /**
   * 依存関係を解決して実行順序を決定（トポロジカルソート）
   */
  private resolveExecutionOrder(tasks: InitializationTask[]): InitializationTask[] {
    const taskMap = new Map<string, InitializationTask>();
    const inDegree = new Map<string, number>();
    const adjacencyList = new Map<string, string[]>();

    // グラフを構築
    tasks.forEach((task) => {
      taskMap.set(task.id, task);
      inDegree.set(task.id, 0);
      adjacencyList.set(task.id, []);
    });

    // 依存関係を構築
    tasks.forEach((task) => {
      if (task.dependencies) {
        task.dependencies.forEach((depId) => {
          // 全タスク（this.tasks）から依存関係を検証
          if (!this.tasks.has(depId)) {
            this.log(`⚠️ Warning: Task ${task.id} depends on non-existent task ${depId}`);
            return;
          }
          // 依存タスクが現在のステージに含まれている場合のみグラフに追加
          if (taskMap.has(depId)) {
            adjacencyList.get(depId)?.push(task.id);
            inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
          }
          // 依存タスクが別のステージの場合は、そのステージが先に実行されるので問題なし
        });
      }
    });

    // トポロジカルソート（Kahn's algorithm）
    const queue: string[] = [];
    const result: InitializationTask[] = [];

    // 入次数が0のタスクをキューに追加
    inDegree.forEach((degree, taskId) => {
      if (degree === 0) {
        queue.push(taskId);
      }
    });

    while (queue.length > 0) {
      const taskId = queue.shift()!;
      const task = taskMap.get(taskId)!;
      result.push(task);

      // 隣接タスクの入次数を減らす
      adjacencyList.get(taskId)?.forEach((nextTaskId) => {
        const newDegree = (inDegree.get(nextTaskId) || 0) - 1;
        inDegree.set(nextTaskId, newDegree);
        if (newDegree === 0) {
          queue.push(nextTaskId);
        }
      });
    }

    // 循環依存のチェック
    if (result.length !== tasks.length) {
      this.log('❌ Circular dependency detected in tasks!');
      throw new Error('Circular dependency detected in initialization tasks');
    }

    return result;
  }

  /**
   * 指定ステージのタスクを取得
   */
  private getTasksForStage(stage: InitializationStage): InitializationTask[] {
    return Array.from(this.tasks.values()).filter((task) => task.stage === stage);
  }

  /**
   * クリティカルエラーがあるかチェック
   */
  private hasCriticalErrors(stage: InitializationStage): boolean {
    const store = useInitializationStore.getState();
    const stageState = store.stages[stage];

    return Object.values(stageState.tasks).some((taskState) => {
      const task = this.tasks.get(taskState.taskId);
      return task?.priority === TaskPriority.CRITICAL && taskState.error;
    });
  }

  /**
   * タイムアウト付きで関数を実行
   */
  private executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Task timeout after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }

  /**
   * リトライ遅延を計算
   */
  private calculateRetryDelay(
    baseDelay: number,
    attempt: number,
    exponentialBackoff?: boolean
  ): number {
    if (exponentialBackoff) {
      return baseDelay * Math.pow(2, attempt - 1);
    }
    return baseDelay;
  }

  /**
   * 最小スプラッシュ表示時間を保証
   */
  private async ensureMinimumSplashDuration(): Promise<void> {
    const elapsed = Date.now() - this.startTime;
    const remaining = this.config.minSplashDuration - elapsed;

    if (remaining > 0) {
      this.log(`⏳ Waiting ${remaining}ms to ensure minimum splash duration...`);
      await this.sleep(remaining);
    }
  }

  /**
   * スリープ
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * ログ出力
   */
  private log(message: string, ...args: any[]): void {
    if (this.config.enableDebugLogs) {
      console.log(`[AppInitializer] ${message}`, ...args);
    }
  }

  /**
   * 登録されているタスクをクリア（テスト用）
   */
  public clearTasks(): void {
    this.tasks.clear();
  }

  /**
   * 現在の設定を取得
   */
  public getConfig(): Required<InitializerConfig> {
    return { ...this.config };
  }
}
