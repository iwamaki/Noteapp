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
import { KeyboardAvoidingWrapper } from './components/KeyboardAvoidingWrapper';
import { usePlatformInfo } from './utils/platformInfo';

const AppContent = () => {
  const { themeMode, colors } = useTheme();
  usePlatformInfo(); // Call the hook here

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
    // ユーザー設定を読み込み
    loadSettings();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <KeyboardAvoidingWrapper>
          <AppContent />
        </KeyboardAvoidingWrapper>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
