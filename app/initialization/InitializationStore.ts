/**
 * @file InitializationStore.ts
 * @summary アプリケーション初期化状態を管理するZustandストア
 * @responsibility 初期化の進捗、エラー、完了状態を一元管理し、
 *                 UIとビジネスロジックに初期化情報を提供します。
 */

import { create } from 'zustand';
import {
  InitializationState,
  InitializationStage,
  TaskStatus,
  TaskExecutionState,
  StageExecutionState,
  InitializationError,
  InitializationEventListener,
} from './types';

/**
 * 初期ステージ状態を生成
 */
const createInitialStageState = (stage: InitializationStage): StageExecutionState => ({
  stage,
  status: TaskStatus.PENDING,
  tasks: {},
  completedCount: 0,
  totalCount: 0,
  progress: 0,
});

/**
 * 初期状態
 */
const initialState: InitializationState = {
  currentStage: null,
  stages: {
    [InitializationStage.CRITICAL]: createInitialStageState(InitializationStage.CRITICAL),
    [InitializationStage.CORE]: createInitialStageState(InitializationStage.CORE),
    [InitializationStage.SERVICES]: createInitialStageState(InitializationStage.SERVICES),
    [InitializationStage.READY]: createInitialStageState(InitializationStage.READY),
  },
  isInitialized: false,
  isInitializing: false,
  hasFailed: false,
  overallProgress: 0,
  errors: [],
};

/**
 * InitializationStoreのインターフェース
 */
interface InitializationStore extends InitializationState {
  // イベントリスナー
  listeners: InitializationEventListener[];

  // アクション
  startInitialization: () => void;
  completeInitialization: () => void;
  failInitialization: () => void;
  resetInitialization: () => void;

  // ステージ管理
  setCurrentStage: (stage: InitializationStage) => void;
  startStage: (stage: InitializationStage) => void;
  completeStage: (stage: InitializationStage) => void;

  // タスク管理
  registerTask: (taskId: string, stage: InitializationStage) => void;
  startTask: (taskId: string, taskName: string) => void;
  completeTask: (taskId: string) => void;
  failTask: (taskId: string, error: InitializationError) => void;
  skipTask: (taskId: string) => void;

  // エラー管理
  addError: (error: InitializationError) => void;
  clearErrors: () => void;

  // リスナー管理
  addEventListener: (listener: InitializationEventListener) => void;
  removeEventListener: (listener: InitializationEventListener) => void;

  // ヘルパー
  updateProgress: () => void;
}

/**
 * InitializationStore
 */
export const useInitializationStore = create<InitializationStore>((set, get) => ({
  ...initialState,
  listeners: [],

  // === 初期化全体の管理 ===

  startInitialization: () => {
    const startTime = new Date();
    set({
      isInitializing: true,
      isInitialized: false,
      hasFailed: false,
      startTime,
      errors: [],
    });
  },

  completeInitialization: () => {
    const { startTime, listeners } = get();
    const endTime = new Date();
    const totalDuration = startTime ? endTime.getTime() - startTime.getTime() : 0;

    set({
      isInitializing: false,
      isInitialized: true,
      endTime,
      totalDuration,
      overallProgress: 100,
    });

    // リスナーに通知
    listeners.forEach((listener) => {
      listener.onInitializationComplete?.(totalDuration);
    });
  },

  failInitialization: () => {
    const { errors, listeners } = get();
    set({
      isInitializing: false,
      hasFailed: true,
      overallProgress: 0,
    });

    // リスナーに通知
    listeners.forEach((listener) => {
      listener.onInitializationFail?.(errors);
    });
  },

  resetInitialization: () => {
    set({
      ...initialState,
      listeners: get().listeners, // リスナーは保持
    });
  },

  // === ステージ管理 ===

  setCurrentStage: (stage: InitializationStage) => {
    set({ currentStage: stage });
  },

  startStage: (stage: InitializationStage) => {
    const { stages, listeners } = get();
    const stageState = stages[stage];

    set({
      currentStage: stage,
      stages: {
        ...stages,
        [stage]: {
          ...stageState,
          status: TaskStatus.IN_PROGRESS,
          startTime: new Date(),
        },
      },
    });

    // リスナーに通知
    listeners.forEach((listener) => {
      listener.onStageStart?.(stage);
    });
  },

  completeStage: (stage: InitializationStage) => {
    const { stages, listeners } = get();
    const stageState = stages[stage];
    const endTime = new Date();
    const duration = stageState.startTime
      ? endTime.getTime() - stageState.startTime.getTime()
      : 0;

    set({
      stages: {
        ...stages,
        [stage]: {
          ...stageState,
          status: TaskStatus.COMPLETED,
          endTime,
          progress: 100,
        },
      },
    });

    // 進捗を更新
    get().updateProgress();

    // リスナーに通知
    listeners.forEach((listener) => {
      listener.onStageComplete?.(stage, duration);
    });
  },

  // === タスク管理 ===

  registerTask: (taskId: string, stage: InitializationStage) => {
    const { stages } = get();
    const stageState = stages[stage];

    set({
      stages: {
        ...stages,
        [stage]: {
          ...stageState,
          tasks: {
            ...stageState.tasks,
            [taskId]: {
              taskId,
              status: TaskStatus.PENDING,
              retryCount: 0,
            },
          },
          totalCount: stageState.totalCount + 1,
        },
      },
    });
  },

  startTask: (taskId: string, taskName: string) => {
    const { stages, currentStage, listeners } = get();
    if (!currentStage) return;

    const stageState = stages[currentStage];
    const taskState = stageState.tasks[taskId];

    if (!taskState) return;

    set({
      stages: {
        ...stages,
        [currentStage]: {
          ...stageState,
          tasks: {
            ...stageState.tasks,
            [taskId]: {
              ...taskState,
              status: TaskStatus.IN_PROGRESS,
              startTime: new Date(),
            },
          },
        },
      },
    });

    // リスナーに通知
    listeners.forEach((listener) => {
      listener.onTaskStart?.(taskId, taskName);
    });
  },

  completeTask: (taskId: string) => {
    const { stages, currentStage, listeners } = get();
    if (!currentStage) return;

    const stageState = stages[currentStage];
    const taskState = stageState.tasks[taskId];

    if (!taskState) return;

    const endTime = new Date();
    const duration = taskState.startTime
      ? endTime.getTime() - taskState.startTime.getTime()
      : 0;

    const updatedStageState = {
      ...stageState,
      tasks: {
        ...stageState.tasks,
        [taskId]: {
          ...taskState,
          status: TaskStatus.COMPLETED,
          endTime,
          duration,
        },
      },
      completedCount: stageState.completedCount + 1,
    };

    // ステージの進捗を計算
    updatedStageState.progress = Math.round(
      (updatedStageState.completedCount / updatedStageState.totalCount) * 100
    );

    set({
      stages: {
        ...stages,
        [currentStage]: updatedStageState,
      },
    });

    // 全体の進捗を更新
    get().updateProgress();

    // リスナーに通知
    listeners.forEach((listener) => {
      listener.onTaskComplete?.(taskId, taskState.taskId, duration);
    });
  },

  failTask: (taskId: string, error: InitializationError) => {
    const { stages, currentStage, listeners } = get();
    if (!currentStage) return;

    const stageState = stages[currentStage];
    const taskState = stageState.tasks[taskId];

    if (!taskState) return;

    set({
      stages: {
        ...stages,
        [currentStage]: {
          ...stageState,
          tasks: {
            ...stageState.tasks,
            [taskId]: {
              ...taskState,
              status: TaskStatus.FAILED,
              error,
              endTime: new Date(),
            },
          },
        },
      },
    });

    // エラーを追加
    get().addError(error);

    // リスナーに通知
    listeners.forEach((listener) => {
      listener.onTaskFail?.(taskId, taskState.taskId, error);
    });
  },

  skipTask: (taskId: string) => {
    const { stages, currentStage } = get();
    if (!currentStage) return;

    const stageState = stages[currentStage];
    const taskState = stageState.tasks[taskId];

    if (!taskState) return;

    set({
      stages: {
        ...stages,
        [currentStage]: {
          ...stageState,
          tasks: {
            ...stageState.tasks,
            [taskId]: {
              ...taskState,
              status: TaskStatus.SKIPPED,
              endTime: new Date(),
            },
          },
        },
      },
    });
  },

  // === エラー管理 ===

  addError: (error: InitializationError) => {
    const { errors } = get();
    set({ errors: [...errors, error] });
  },

  clearErrors: () => {
    set({ errors: [] });
  },

  // === リスナー管理 ===

  addEventListener: (listener: InitializationEventListener) => {
    const { listeners } = get();
    set({ listeners: [...listeners, listener] });
  },

  removeEventListener: (listener: InitializationEventListener) => {
    const { listeners } = get();
    set({ listeners: listeners.filter((l) => l !== listener) });
  },

  // === ヘルパー ===

  updateProgress: () => {
    const { stages, currentStage, listeners } = get();

    // 各ステージの重み（合計100）
    const stageWeights = {
      [InitializationStage.CRITICAL]: 30,
      [InitializationStage.CORE]: 30,
      [InitializationStage.SERVICES]: 25,
      [InitializationStage.READY]: 15,
    };

    // 全体の進捗を計算
    let totalProgress = 0;
    Object.values(InitializationStage).forEach((stage) => {
      const stageState = stages[stage];
      const stageProgress = stageState.progress || 0;
      const weight = stageWeights[stage] / 100;
      totalProgress += stageProgress * weight;
    });

    set({ overallProgress: Math.round(totalProgress) });

    // リスナーに通知
    if (currentStage) {
      listeners.forEach((listener) => {
        listener.onProgressUpdate?.(Math.round(totalProgress), currentStage);
      });
    }
  },
}));
