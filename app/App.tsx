/**
 * @file App.tsx
 * @summary このファイルはNoteappアプリケーションの主要なエントリポイントとして機能します。
 * ルートナビゲーション構造を初期化します。
 * @responsibility その主な責任は、トップレベルのアプリケーションレイアウトとナビゲーションフローを設定し、
 * すべてのコア機能にアクセスできるようにすることです。
 */
import React from 'react';
import RootNavigator from './navigation/RootNavigator';

export default function App() {
  return <RootNavigator />;
}
