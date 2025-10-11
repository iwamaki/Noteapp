/**
 * @file constants.ts
 * @summary アプリケーション全体で共有される定数を定義します。
 * @description このファイルには、UIのサイジング、アニメーションの持続時間、またはその他の固定値を一元管理するための定数が含まれています。
 */

import { Platform } from 'react-native';

// チャット入力バーの高さ
export const CHAT_INPUT_HEIGHT = Platform.OS === 'ios' ? 88 : 92;
