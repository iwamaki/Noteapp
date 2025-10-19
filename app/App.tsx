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
import { View, StyleSheet } from 'react-native';

/**
 * @function AppContent
 * @description アプリケーションのメインコンテンツをレンダリングするコンポーネント。
 * テーマに基づいてステータスバーのスタイルを設定し、ルートナビゲーターを表示します。
 * @returns {JSX.Element} アプリケーションのメインコンテンツ。
 */
const AppContent = () => {
  const { themeMode, colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.secondary,
    },
  });

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.secondary}
      />
      <RootNavigator />
    </View>
  );
};

/**
 * @function App
 * @description アプリケーションのルートコンポーネント。
 * ユーザー設定の読み込み、SafeAreaProviderとThemeProviderの提供、およびAppContentのレンダリングを行います。
 * @returns {JSX.Element} アプリケーションのルート要素。
 */
export default function App() {
  const { loadSettings } = useSettingsStore();

  useEffect(() => {
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
