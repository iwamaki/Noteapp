/**
 * @file SplashScreen.tsx
 * @summary アプリケーション起動時のスプラッシュ画面
 * @responsibility 初期化完了まで表示し、進捗状況やエラーを表示します
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useInitializationStore } from '../initialization/InitializationStore';

// Color constants
const COLORS = {
  background: '#fff',
  title: '#333',
  text: '#666',
  textLight: '#999',
  error: '#dc3545',
} as const;

interface SplashScreenProps {
  showProgress?: boolean; // 進捗率を表示するか（オプション）
}

/**
 * スプラッシュ画面コンポーネント
 *
 * 初期化状態を監視し、適切なフィードバックをユーザーに提供します。
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({ showProgress = false }) => {
  const { isInitializing, hasFailed, overallProgress, currentStage, errors } = useInitializationStore();

  // 初期化が完了していれば、スプラッシュ画面は表示しない
  // （この判定は親コンポーネントで行うべきですが、念のため）
  if (!isInitializing && !hasFailed) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* アプリロゴ・タイトル */}
        <Text style={styles.title}>Noteapp</Text>

        {/* ローディングまたはエラー表示 */}
        {hasFailed ? (
          <>
            <Text style={styles.errorText}>初期化に失敗しました</Text>
            {errors.length > 0 && (
              <Text style={styles.errorDetail}>
                {errors[0].message}
              </Text>
            )}
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color="#007AFF" style={styles.spinner} />
            <Text style={styles.statusText}>
              {currentStage ? `初期化中... (${getStageLabel(currentStage)})` : '初期化中...'}
            </Text>
            {showProgress && (
              <Text style={styles.progressText}>{Math.round(overallProgress)}%</Text>
            )}
          </>
        )}
      </View>
    </View>
  );
};

/**
 * ステージラベルを取得
 */
function getStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    critical: '必須リソース',
    core: 'コアサービス',
    services: 'アプリサービス',
    ready: '準備中',
  };
  return labels[stage] || stage;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.title,
    marginBottom: 40,
  },
  spinner: {
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
  },
  progressText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 10,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.error,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorDetail: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
