/**
 * @file SettingsScreen.tsx
 * @summary このファイルは、アプリケーションの設定画面をレンダリングします。
 * @responsibility ユーザーがアプリケーションの各種設定（表示、動作、LLM関連など）を閲覧・変更できるUIを提供し、設定の永続化と更新を管理します。
 */
import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  useUISettingsStore,
  useEditorSettingsStore,
  useLLMSettingsStore,
  useUsageTrackingStore,
  useTokenBalanceStore
} from './settingsStore';
import { useTheme } from '../design/theme/ThemeContext';
import { useSettingsHeader } from './hooks/useSettingsHeader';
import { ListItem } from '../components/ListItem';
import { TokenUsageSection } from './components/TokenUsageSection';
import { MainContainer } from '../components/MainContainer';
import { useGoogleAuthCodeFlow } from '../auth/useGoogleAuthCodeFlow';
import { useAuth } from '../auth/authStore';

function SettingsScreen() {
  const { colors, spacing, typography } = useTheme();

  // 各設定ストアから個別に取得
  const uiSettings = useUISettingsStore();
  const editorSettings = useEditorSettingsStore();
  const llmSettings = useLLMSettingsStore();
  const { checkAndResetMonthlyUsageIfNeeded } = useUsageTrackingStore();
  const tokenBalanceStore = useTokenBalanceStore();

  // ローディング状態は各ストアを統合
  const isLoading = uiSettings.isLoading || editorSettings.isLoading || llmSettings.isLoading;

  // 認証ストアから状態とアクションを取得
  const {
    googleUser,
    isLoggingIn,
    isLoggingOut,
    handleGoogleAuthResult,
    logout,
    error: authError,
  } = useAuth();

  // Google OAuth2認証フック（Authorization Code Flow）
  const { login, result, isLoading: isGoogleAuthLoading, error: googleAuthError } = useGoogleAuthCodeFlow();

  useEffect(() => {
    // 各ストアの設定を読み込み
    uiSettings.loadSettings();
    editorSettings.loadSettings();
    llmSettings.loadSettings();
    // 月次使用量のリセットチェック（月が変わったらリセット）
    checkAndResetMonthlyUsageIfNeeded();
  }, []);

  // Google認証結果を処理
  useEffect(() => {
    if (result) {
      handleAuthResult(result);
    }
  }, [result]);

  // Google認証エラーを表示
  useEffect(() => {
    if (googleAuthError) {
      Alert.alert('エラー', `Googleログインに失敗しました: ${googleAuthError}`);
    }
  }, [googleAuthError]);

  // 認証ストアのエラーを表示
  useEffect(() => {
    if (authError) {
      Alert.alert('エラー', authError);
    }
  }, [authError]);

  // Google認証結果を処理（Authorization Code Flow）
  const handleAuthResult = async (authResult: any) => {
    try {
      // 認証ストアに処理を委譲
      await handleGoogleAuthResult(authResult);

      Alert.alert(
        '成功',
        authResult.is_new_user
          ? 'Googleアカウントでログインしました'
          : 'Googleアカウントにログインしました'
      );
    } catch (error) {
      Alert.alert('エラー', 'Googleログイン処理に失敗しました');
      console.error('Google auth result handling error:', error);
    }
  };

  // Googleログインボタンのハンドラー（Authorization Code Flow）
  const handleGoogleLogin = async () => {
    await login();
  };

  // Googleログアウトボタンのハンドラー
  const handleGoogleLogout = async () => {
    Alert.alert(
      'ログアウト',
      'Googleアカウントからログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: async () => {
            await logout();
            Alert.alert('完了', 'ログアウトしました');
          },
        },
      ]
    );
  };

  // ヘッダー設定
  useSettingsHeader();

  const renderSection = (title: string) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );

  const renderPicker = (
    label: string,
    value: string,
    options: { label: string; value: string }[],
    onChange: (value: string) => void
  ) => (
    <ListItem.Container>
      <ListItem.Title>{label}</ListItem.Title>
      <ListItem.ButtonGroup
        options={options}
        value={value}
        onChange={onChange}
      />
    </ListItem.Container>
  );

  // スタイルをメモ化（テーマが変わったときのみ再作成）
  /* eslint-disable react-native/no-unused-styles */
  const styles = useMemo(
    () => StyleSheet.create({
      scrollView: {
        flex: 1,
      },
      content: {
        padding: spacing.lg,
      },
      sectionTitle: {
        ...typography.subtitle,
        marginTop: spacing.xl,
        marginBottom: spacing.md,
        color: colors.primary,
      },
      infoText: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
      },
      resetButton: {
        backgroundColor: colors.danger,
        padding: spacing.lg,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: spacing.xl,
        marginBottom: spacing.xxl,
      },
      resetButtonText: {
        ...typography.subtitle,
        color: colors.background,
      },
      googleButton: {
        backgroundColor: colors.primary,
        padding: spacing.lg,
        borderRadius: 8,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        marginVertical: spacing.md,
      },
      googleButtonText: {
        ...typography.subtitle,
        color: colors.background,
        marginLeft: spacing.sm,
      },
      accountInfo: {
        padding: spacing.lg,
        backgroundColor: colors.secondary,
        borderRadius: 8,
        marginBottom: spacing.md,
      },
      accountEmail: {
        ...typography.body,
        color: colors.text,
        fontWeight: '600',
      },
      accountName: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: spacing.xs,
      },
      logoutButton: {
        backgroundColor: colors.danger,
        padding: spacing.md,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: spacing.sm,
      },
      logoutButtonText: {
        ...typography.body,
        color: colors.background,
      },
    }),
    [colors, spacing, typography]
  );
  /* eslint-enable react-native/no-unused-styles */

  return (
    <MainContainer isLoading={isLoading}>
      <ScrollView style={styles.scrollView}>
      <View style={styles.content}>
        {renderSection('アカウント')}

        {googleUser ? (
          // ログイン済み - アカウント情報を表示
          <>
            <View style={styles.accountInfo}>
              <Text style={styles.accountEmail}>{googleUser.email}</Text>
              {googleUser.displayName && (
                <Text style={styles.accountName}>{googleUser.displayName}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleGoogleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.logoutButtonText}>ログアウト</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          // 未ログイン - Googleログインボタンを表示
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            disabled={isGoogleAuthLoading || isLoggingIn}
          >
            {isGoogleAuthLoading || isLoggingIn ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <>
                <Text style={styles.googleButtonText}>Googleでログイン</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {renderSection('表示設定')}

        {renderPicker(
          'テーマ',
          uiSettings.settings.theme,
          [
            { label: 'ライト', value: 'light' },
            { label: 'ダーク', value: 'dark' },
            { label: 'システム', value: 'system' },
          ],
          (value) => uiSettings.updateSettings({ theme: value as 'light' | 'dark' | 'system' })
        )}

        {renderPicker(
          'フォントサイズ',
          uiSettings.settings.fontSize,
          [
            { label: '小', value: 'small' },
            { label: '中', value: 'medium' },
            { label: '大', value: 'large' },
            { label: '特大', value: 'xlarge' },
          ],
          (value) => uiSettings.updateSettings({ fontSize: value as 'small' | 'medium' | 'large' | 'xlarge' })
        )}

        {renderPicker(
          'デフォルトファイル表示',
          editorSettings.settings.defaultFileViewScreen,
          [
            { label: '編集画面', value: 'edit' },
            { label: 'プレビュー', value: 'preview' },
          ],
          (value) => editorSettings.updateSettings({ defaultFileViewScreen: value as 'edit' | 'preview' })
        )}

        {renderPicker(
          'カテゴリーソート方法',
          uiSettings.settings.categorySortMethod,
          [
            { label: '名前順', value: 'name' },
            { label: 'ファイル数順', value: 'fileCount' },
          ],
          (value) => uiSettings.updateSettings({ categorySortMethod: value as 'name' | 'fileCount' })
        )}

        {renderPicker(
          'ファイルソート方法',
          uiSettings.settings.fileSortMethod,
          [
            { label: '名前順', value: 'name' },
            { label: '更新日順', value: 'updatedAt' },
          ],
          (value) => uiSettings.updateSettings({ fileSortMethod: value as 'updatedAt' | 'name' })
        )}

        <ListItem.Container>
          {/* eslint-disable-next-line react-native/no-raw-text */}
          <ListItem.Title>ファイルリストに要約を表示</ListItem.Title>
          <Switch
            value={uiSettings.settings.showSummary}
            onValueChange={(value: boolean) => uiSettings.updateSettings({ showSummary: value })}
          />
        </ListItem.Container>

        {renderSection('LLM/AI機能')}

        <ListItem.Container>
          {/* eslint-disable-next-line react-native/no-raw-text */}
          <ListItem.Title>LLM機能を有効にする</ListItem.Title>
          <Switch
            value={llmSettings.settings.llmEnabled}
            onValueChange={(value: boolean) => llmSettings.updateSettings({ llmEnabled: value })}
          />
        </ListItem.Container>

        {/* LLMプロバイダーとモデルの切り替えはLLMモデル設定画面で行うため、ここでは非表示 */}

        {/* トークン残高・使用量セクション（LLM機能のオン/オフに関係なく常に表示） */}
        <TokenUsageSection />

        <Text style={styles.infoText}>
          その他の設定項目は今後のアップデートで追加予定です。
        </Text>

        {/* デバッグ用リセットボタン（開発モードのみ） */}
        {__DEV__ && (
          <>
            {renderSection('デバッグ機能')}
            <TouchableOpacity
              style={[styles.resetButton, { backgroundColor: colors.primary }]}
              onPress={async () => {
                await tokenBalanceStore.resetTokensAndUsage();
                Alert.alert('完了', 'トークン残高と使用量をリセットしました');
              }}
            >
              <Text style={styles.resetButtonText}>トークンと使用量をリセット</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={styles.resetButton}
          onPress={async () => {
            // 全ストアの設定をリセット
            await Promise.all([
              uiSettings.resetSettings(),
              editorSettings.resetSettings(),
              llmSettings.resetSettings(),
            ]);
          }}
        >
          <Text style={styles.resetButtonText}>設定をリセット</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </MainContainer>
  );
}

export default SettingsScreen;