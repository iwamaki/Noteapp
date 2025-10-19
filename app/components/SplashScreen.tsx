/**
 * @file SplashScreen.tsx
 * @summary アプリケーション起動時のスプラッシュ画面
 * @responsibility 初期化完了まで表示し、進捗状況やエラーを表示します
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useInitializationStore } from '../initialization/InitializationStore';

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
    backgroundColor: '#fff',
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
    color: '#333',
    marginBottom: 40,
  },
  spinner: {
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  progressText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
  },
  errorText: {
    fontSize: 18,
    color: '#dc3545',
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorDetail: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
