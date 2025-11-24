/**
 * @file index.ts
 * @summary Chatモジュールのエントリーポイント
 * @responsibility ChatServiceのシングルトンインスタンスをエクスポート
 */

export { default } from './chatOrchestrator';

// 型のエクスポート
export type { ActiveScreenContext, ActiveScreenContextProvider } from './types';
