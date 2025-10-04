/**
 * @file App.tsx
 * @summary このファイルはNoteappアプリケーションの主要なエントリポイントとして機能します。
 * ルートナビゲーション構造を初期化します。
 * @responsibility その主な責任は、トップレベルのアプリケーションレイアウトとナビゲーションフローを設定し、
 * すべてのコア機能にアクセスできるようにすることです。
 */
import React, { useEffect } from 'react';
import RootNavigator from './navigation/RootNavigator';
import { logger } from './utils/logger';

export default function App() {
  useEffect(() => {
    // アプリのログカテゴリを'chat'のみに設定
    logger.setCategories(['chat', 'llm']);
  }, []);

  return <RootNavigator />;
}
