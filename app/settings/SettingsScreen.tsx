/**
 * @file SettingsScreen.tsx
 * @summary このファイルは、アプリケーションの設定画面をレンダリングします。
 * @responsibility ユーザーがアプリケーションの各種設定（表示、動作、LLM関連など）を閲覧・変更できるUIを提供し、設定の永続化と更新を管理します。
 */
import React, { useEffect, useMemo, useState } from 'react';
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
import { useSettingsStore } from './settingsStore';
import { useTheme } from '../design/theme/ThemeContext';
import { useSettingsHeader } from './hooks/useSettingsHeader';
import { ListItem } from '../components/ListItem';
import { TokenUsageSection } from './components/TokenUsageSection';
import { MainContainer } from '../components/MainContainer';
import { useGoogleAuthCodeFlow } from '../auth/useGoogleAuthCodeFlow';
import { saveTokens } from '../auth/tokenService';
import { saveUserId } from '../auth/deviceIdService';
import {
  getGoogleUserInfo,
  saveGoogleUserInfo,
  clearGoogleUserInfo,
  GoogleUserInfo,
} from '../auth/googleUserService';

function SettingsScreen() {
  const { colors, spacing, typography } = useTheme();
  const { settings, loadSettings, updateSettings, isLoading, checkAndResetMonthlyUsageIfNeeded } = useSettingsStore();
  const [googleUser, setGoogleUser] = useState<GoogleUserInfo | null>(null);

  // Google OAuth2認証フック（Authorization Code Flow）
  const { login, result, isLoading: isGoogleAuthLoading, error: googleAuthError } = useGoogleAuthCodeFlow();

  useEffect(() => {
    loadSettings();
    // 月次使用量のリセットチェック（月が変わったらリセット）
    checkAndResetMonthlyUsageIfNeeded();
    // Googleユーザー情報をロード
    loadGoogleUserInfo();
  }, []);

  // Google認証結果を処理
  useEffect(() => {
    if (result) {
      handleGoogleAuthResult(result);
    }
  }, [result]);

  // Google認証エラーを表示
  useEffect(() => {
    if (googleAuthError) {
      Alert.alert('エラー', `Googleログインに失敗しました: ${googleAuthError}`);
    }
  }, [googleAuthError]);

  // Googleユーザー情報をロード
  const loadGoogleUserInfo = async () => {
    const userInfo = await getGoogleUserInfo();
    setGoogleUser(userInfo);
  };

  // Google認証結果を処理（Authorization Code Flow）
  const handleGoogleAuthResult = async (authResult: any) => {
    try {
      // トークンを保存
      await saveTokens(authResult.access_token, authResult.refresh_token);
      // ユーザーIDを保存
      await saveUserId(authResult.user_id);
      // Googleユーザー情報を保存
      await saveGoogleUserInfo({
        email: authResult.email,
        displayName: authResult.display_name,
        profilePictureUrl: authResult.profile_picture_url,
      });

      // UIを更新
      setGoogleUser({
        email: authResult.email,
        displayName: authResult.display_name,
        profilePictureUrl: authResult.profile_picture_url,
      });

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
            await clearGoogleUserInfo();
            setGoogleUser(null);
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
            <TouchableOpacity style={styles.logoutButton} onPress={handleGoogleLogout}>
              <Text style={styles.logoutButtonText}>ログアウト</Text>
            </TouchableOpacity>
          </>
        ) : (
          // 未ログイン - Googleログインボタンを表示
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            disabled={isGoogleAuthLoading}
          >
            {isGoogleAuthLoading ? (
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
          settings.theme,
          [
            { label: 'ライト', value: 'light' },
            { label: 'ダーク', value: 'dark' },
            { label: 'システム', value: 'system' },
          ],
          (value) => updateSettings({ theme: value as 'light' | 'dark' | 'system' })
        )}

        {renderPicker(
          'フォントサイズ',
          settings.fontSize,
          [
            { label: '小', value: 'small' },
            { label: '中', value: 'medium' },
            { label: '大', value: 'large' },
            { label: '特大', value: 'xlarge' },
          ],
          (value) => updateSettings({ fontSize: value as 'small' | 'medium' | 'large' | 'xlarge' })
        )}

        {renderPicker(
          'デフォルトファイル表示',
          settings.defaultFileViewScreen,
          [
            { label: '編集画面', value: 'edit' },
            { label: 'プレビュー', value: 'preview' },
          ],
          (value) => updateSettings({ defaultFileViewScreen: value as 'edit' | 'preview' })
        )}

        {renderPicker(
          'カテゴリーソート方法',
          settings.categorySortMethod,
          [
            { label: '名前順', value: 'name' },
            { label: 'ファイル数順', value: 'fileCount' },
          ],
          (value) => updateSettings({ categorySortMethod: value as 'name' | 'fileCount' })
        )}

        {renderPicker(
          'ファイルソート方法',
          settings.fileSortMethod,
          [
            { label: '名前順', value: 'name' },
            { label: '更新日順', value: 'updatedAt' },
          ],
          (value) => updateSettings({ fileSortMethod: value as 'updatedAt' | 'name' })
        )}

        <ListItem.Container>
          {/* eslint-disable-next-line react-native/no-raw-text */}
          <ListItem.Title>ファイルリストに要約を表示</ListItem.Title>
          <Switch
            value={settings.showSummary}
            onValueChange={(value: boolean) => updateSettings({ showSummary: value })}
          />
        </ListItem.Container>

        {renderSection('LLM/AI機能')}

        <ListItem.Container>
          {/* eslint-disable-next-line react-native/no-raw-text */}
          <ListItem.Title>LLM機能を有効にする</ListItem.Title>
          <Switch
            value={settings.llmEnabled}
            onValueChange={(value: boolean) => updateSettings({ llmEnabled: value })}
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
                const { resetTokensAndUsage } = useSettingsStore.getState();
                await resetTokensAndUsage();
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
            const { resetSettings } = useSettingsStore.getState();
            await resetSettings();
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