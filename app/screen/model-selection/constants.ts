/**
 * @file constants.ts
 * @summary モデル選択画面で使用する定数
 */

export interface ModelInfo {
  id: string;
  name: string;
  shortName: string;
  description: string;
  category: 'quick' | 'think';
  recommended?: boolean;
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  // Quick models
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    shortName: '2.5 Flash',
    description: '高速・最新版（推奨）',
    category: 'quick',
    recommended: true,
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    shortName: '1.5 Flash',
    description: '安定版・実績あり',
    category: 'quick',
  },
  // Think models
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    shortName: '2.5 Pro',
    description: '最高性能・複雑なタスク向け（推奨）',
    category: 'think',
    recommended: true,
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    shortName: '1.5 Pro',
    description: '安定版・コスト重視',
    category: 'think',
  },
];
