/**
 * @file App.tsx
 * @summary このファイルはNoteappアプリケーションの主要なエントリポイントとして機能します。
 * ルートナビゲーション構造を初期化し、テーマとユーザー設定を読み込みます。
 * @responsibility その主な責任は、トップレベルのアプリケーションレイアウトとナビゲーションフローを設定し、
 * すべてのコア機能にアクセスできるようにすることです。
 */
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './navigation/RootNavigator';
import { ThemeProvider, useTheme } from './design/theme/ThemeContext';
import { View, StyleSheet } from 'react-native';
import { AppInitializer } from './initialization/AppInitializer';
import { allInitializationTasks } from './initialization/tasks';
import { useInitializationStore } from './initialization/InitializationStore';
import { SplashScreen } from './components/SplashScreen';

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
 * 初期化マネージャーを使用してアプリケーションの初期化を行い、
 * 完了までスプラッシュ画面を表示します。
 * @returns {JSX.Element} アプリケーションのルート要素。
 */
export default function App() {
  const { isInitialized, hasFailed } = useInitializationStore();
  const [initError, setInitError] = useState<Error | null>(null);

  useEffect(() => {
    // 初期化マネージャーのセットアップと実行
    const initializeApp = async () => {
      try {
        const initializer = AppInitializer.getInstance({
          enableDebugLogs: __DEV__,
          minSplashDuration: 500, // 最低0.5秒表示
        });

        // タスクを登録
        initializer.registerTasks(allInitializationTasks);

        // 初期化を実行
        await initializer.initialize();
      } catch (error) {
        console.error('[App] Initialization failed:', error);
        setInitError(error instanceof Error ? error : new Error(String(error)));
      }
    };

    initializeApp();
  }, []);

  // 初期化が完了していない、または失敗した場合はスプラッシュ画面を表示
  if (!isInitialized || hasFailed) {
    return <SplashScreen showProgress={__DEV__} />;
  }

  // 初期化エラーがある場合は、エラー情報を表示（開発時のみ）
  if (__DEV__ && initError) {
    console.warn('[App] Init error occurred but app is marked as initialized:', initError);
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
