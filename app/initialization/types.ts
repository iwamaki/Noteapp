/**
 * @file types.ts
 * @summary アプリケーション初期化システムの型定義
 * @responsibility 初期化マネージャー、タスク、状態管理の型を定義し、
 *                 型安全な初期化フローを保証します。
 */

/**
 * 初期化ステージの定義
 * アプリケーション起動時の初期化を4つのステージに分割
 */
export enum InitializationStage {
  /** Stage 1: 必須リソースの初期化 */
  CRITICAL = 'critical',
  /** Stage 2: コアサービスの初期化 */
  CORE = 'core',
  /** Stage 3: アプリケーションサービスの初期化 */
  SERVICES = 'services',
  /** Stage 4: UI表示準備完了 */
  READY = 'ready',
}

/**
 * タスクの実行状態
 */
export enum TaskStatus {
  /** 未実行 */
  PENDING = 'pending',
  /** 実行中 */
  IN_PROGRESS = 'in_progress',
  /** 完了 */
  COMPLETED = 'completed',
  /** 失敗 */
  FAILED = 'failed',
  /** スキップ（依存関係の失敗により） */
  SKIPPED = 'skipped',
}

/**
 * 初期化タスクの優先度
 */
export enum TaskPriority {
  /** 最高優先度（失敗時はアプリ起動を中断） */
  CRITICAL = 'critical',
  /** 高優先度（失敗時は警告を表示） */
  HIGH = 'high',
  /** 通常優先度（失敗時はログのみ） */
  NORMAL = 'normal',
  /** 低優先度（バックグラウンドで実行可能） */
  LOW = 'low',
}

/**
 * 初期化エラーの情報
 */
export interface InitializationError {
  /** タスクID */
  taskId: string;
  /** タスク名 */
  taskName: string;
  /** エラーメッセージ */
  message: string;
  /** エラーオブジェクト */
  error: Error | unknown;
  /** エラー発生時刻 */
  timestamp: Date;
  /** リトライ回数 */
  retryCount: number;
  /** スタックトレース（あれば） */
  stack?: string;
}

/**
 * 初期化タスクのインターフェース
 */
export interface InitializationTask {
  /** タスクの一意識別子 */
  id: string;

  /** タスク名（表示用） */
  name: string;

  /** タスクの説明 */
  description: string;

  /** 所属するステージ */
  stage: InitializationStage;

  /** 優先度 */
  priority: TaskPriority;

  /** 依存する他のタスクのID（これらが完了してから実行） */
  dependencies?: string[];

  /** タスクの実行関数 */
  execute: () => Promise<void>;

  /** タスク失敗時のフォールバック関数（オプション） */
  fallback?: (error: Error) => Promise<void>;

  /** リトライ設定 */
  retry?: {
    /** 最大リトライ回数 */
    maxAttempts: number;
    /** リトライ間隔（ミリ秒） */
    delayMs: number;
    /** 指数バックオフを使用するか */
    exponentialBackoff?: boolean;
  };

  /** タイムアウト設定（ミリ秒、デフォルトは30秒） */
  timeout?: number;
}

/**
 * タスクの実行状態
 */
export interface TaskExecutionState {
  /** タスクID */
  taskId: string;
  /** 実行状態 */
  status: TaskStatus;
  /** 開始時刻 */
  startTime?: Date;
  /** 完了時刻 */
  endTime?: Date;
  /** 実行時間（ミリ秒） */
  duration?: number;
  /** エラー情報 */
  error?: InitializationError;
  /** リトライ回数 */
  retryCount: number;
}

/**
 * ステージの実行状態
 */
export interface StageExecutionState {
  /** ステージ */
  stage: InitializationStage;
  /** 実行状態 */
  status: TaskStatus;
  /** 開始時刻 */
  startTime?: Date;
  /** 完了時刻 */
  endTime?: Date;
  /** タスク実行状態のマップ */
  tasks: Record<string, TaskExecutionState>;
  /** 完了したタスク数 */
  completedCount: number;
  /** 総タスク数 */
  totalCount: number;
  /** 進捗率（0-100） */
  progress: number;
}

/**
 * 全体の初期化状態
 */
export interface InitializationState {
  /** 現在のステージ */
  currentStage: InitializationStage | null;

  /** 各ステージの実行状態 */
  stages: Record<InitializationStage, StageExecutionState>;

  /** 初期化が完了したか */
  isInitialized: boolean;

  /** 初期化中か */
  isInitializing: boolean;

  /** 初期化失敗か */
  hasFailed: boolean;

  /** 全体の進捗率（0-100） */
  overallProgress: number;

  /** エラー一覧 */
  errors: InitializationError[];

  /** 初期化開始時刻 */
  startTime?: Date;

  /** 初期化完了時刻 */
  endTime?: Date;

  /** 総実行時間（ミリ秒） */
  totalDuration?: number;
}

/**
 * 初期化マネージャーの設定
 */
export interface InitializerConfig {
  /** スプラッシュ画面の最小表示時間（ミリ秒） */
  minSplashDuration?: number;

  /** デバッグログを有効にするか */
  enableDebugLogs?: boolean;

  /** 初期化タイムアウト（ミリ秒、デフォルトは60秒） */
  globalTimeout?: number;

  /** クリティカルエラー時にアプリを停止するか */
  stopOnCriticalError?: boolean;

  /** 並列実行する最大タスク数（同一ステージ内） */
  maxConcurrentTasks?: number;

  /** InitializationStoreを使用するか（バックグラウンドタスクではfalseに設定） */
  useStore?: boolean;
}

/**
 * 初期化イベントのリスナー
 */
export interface InitializationEventListener {
  /** タスク開始時 */
  onTaskStart?: (taskId: string, taskName: string) => void;

  /** タスク完了時 */
  onTaskComplete?: (taskId: string, taskName: string, duration: number) => void;

  /** タスク失敗時 */
  onTaskFail?: (taskId: string, taskName: string, error: InitializationError) => void;

  /** ステージ開始時 */
  onStageStart?: (stage: InitializationStage) => void;

  /** ステージ完了時 */
  onStageComplete?: (stage: InitializationStage, duration: number) => void;

  /** 進捗更新時 */
  onProgressUpdate?: (progress: number, currentStage: InitializationStage) => void;

  /** 初期化完了時 */
  onInitializationComplete?: (totalDuration: number) => void;

  /** 初期化失敗時 */
  onInitializationFail?: (errors: InitializationError[]) => void;
}
