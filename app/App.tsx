/**
 * @file App.tsx
 * @summary このファイルはNoteappアプリケーションの主要なエントリポイントとして機能します。
 * ルートナビゲーション構造を初期化し、テーマとユーザー設定を読み込みます。
 * @responsibility その主な責任は、トップレベルのアプリケーションレイアウトとナビゲーションフローを設定し、
 * すべてのコア機能にアクセスできるようにすることです。
 */
import React, { useEffect } from 'react';
import RootNavigator from './navigation/RootNavigator';
import { ThemeProvider } from './design/theme/ThemeContext';
import { useSettingsStore } from './settings/settingsStore';
import { logger } from './utils/logger';
import { KeyboardProvider } from './design/theme/KeyboardProvider';

export default function App() {
  const { loadSettings } = useSettingsStore();

  useEffect(() => {
    // アプリのログカテゴリを'chat'のみに設定
    logger.setCategories(['chat', 'llm']);

    // ユーザー設定を読み込み
    loadSettings();
  }, []);

  return (
    <ThemeProvider>
      <KeyboardProvider>
        <RootNavigator />
      </KeyboardProvider>
    </ThemeProvider>
  );
}
