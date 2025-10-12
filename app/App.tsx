/**
 * @file App.tsx
 * @summary このファイルはNoteappアプリケーションの主要なエントリポイントとして機能します。
 * ルートナビゲーション構造を初期化し、テーマとユーザー設定を読み込みます。
 * @responsibility その主な責任は、トップレベルのアプリケーションレイアウトとナビゲーションフローを設定し、
 * すべてのコア機能にアクセスできるようにすることです。
 */
import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './navigation/RootNavigator';
import { ThemeProvider, useTheme } from './design/theme/ThemeContext';
import { useSettingsStore } from './settings/settingsStore';
import { logger } from './utils/logger';

const AppContent = () => {
  const { themeMode, colors } = useTheme();

  return (
    <>
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.secondary}
      />
      <RootNavigator />
    </>
  );
};

export default function App() {
  const { loadSettings } = useSettingsStore();

  useEffect(() => {
    // アプリのログカテゴリを'chat'のみに設定
    logger.setCategories(['chat', 'llm']);

    // ユーザー設定を読み込み
    loadSettings();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
