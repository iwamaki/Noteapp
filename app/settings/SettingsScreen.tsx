/**
 * @file SettingsScreen.tsx
 * @summary このファイルは、アプリケーションの設定画面をレンダリングします。
 * @responsibility ユーザーがアプリケーションの各種設定（表示、動作、LLM関連など）を閲覧・変更できるUIを提供し、設定の永続化と更新を管理します。
 */
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useSettingsStore } from './settingsStore';
import { useTheme } from '../design/theme/ThemeContext';
import { useSettingsHeader } from './hooks/useSettingsHeader';
import APIService from '../features/chat/llmService/api';
import { LLMProvider } from '../features/chat/llmService/types/types';
import { ListItem } from '../components/ListItem';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription, useUsageLimit, getUsageColor, useMonthlyCost } from '../utils/subscriptionHelpers';
import { SUBSCRIPTION_PLANS } from '../constants/plans';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

function SettingsScreen() {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { tier, status } = useSubscription();
  const { settings, loadSettings, updateSettings, isLoading, checkAndResetMonthlyUsageIfNeeded } = useSettingsStore();

  // トークン使用量情報を取得
  const tokenUsage = useUsageLimit('maxMonthlyTokens');

  // 月間コスト情報を取得（開発時のみ）
  const costInfo = __DEV__ ? useMonthlyCost() : null;

  // 初期値にキャッシュを使用（キャッシュがあれば即座に表示）
  const [llmProviders, setLlmProviders] = useState<Record<string, LLMProvider>>(
    () => APIService.getCachedLLMProviders() || {}
  );
  const [isLoadingProviders, setIsLoadingProviders] = useState(
    () => !APIService.getCachedLLMProviders() // キャッシュがなければローディング状態
  );

  useEffect(() => {
    loadSettings();
    // 月次使用量のリセットチェック（月が変わったらリセット）
    checkAndResetMonthlyUsageIfNeeded();

    // キャッシュがあればすぐ表示、なければ読み込み
    const cached = APIService.getCachedLLMProviders();
    if (cached) {
      setLlmProviders(cached);
      setIsLoadingProviders(false);
    } else {
      loadLLMProviders();
    }
  }, []);

  const loadLLMProviders = async () => {
    try {
      const providers = await APIService.loadLLMProviders();
      setLlmProviders(providers);
    } catch (error) {
      console.error('Failed to load LLM providers:', error);
    } finally {
      setIsLoadingProviders(false);
    }
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
      container: {
        flex: 1,
        backgroundColor: colors.background,
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
      loadingContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
      },
      loadingText: {
        ...typography.body,
        color: colors.textSecondary,
      },
      subscriptionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.secondary,
        padding: spacing.lg,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.lg,
      },
      subscriptionButtonContent: {
        flex: 1,
      },
      subscriptionButtonTitle: {
        ...typography.subtitle,
        color: colors.text,
        marginBottom: 4,
      },
      subscriptionButtonSubtitle: {
        ...typography.caption,
        color: colors.textSecondary,
      },
      subscriptionIcon: {
        marginLeft: spacing.md,
      },
      usageContainer: {
        backgroundColor: colors.secondary,
        padding: spacing.md,
        marginHorizontal: spacing.md,
        marginBottom: spacing.md,
        borderRadius: 12,
      },
      usageTitle: {
        ...typography.subtitle,
        color: colors.text,
        marginBottom: spacing.sm,
      },
      usageStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
      },
      usageText: {
        ...typography.body,
        color: colors.text,
      },
      usagePercentage: {
        ...typography.body,
        fontWeight: '600',
      },
      progressBarContainer: {
        height: 8,
        backgroundColor: colors.border,
        borderRadius: 4,
        overflow: 'hidden',
      },
      progressBar: {
        height: '100%',
        borderRadius: 4,
      },
      modelBreakdownTitle: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
        fontWeight: '600',
      },
      modelBreakdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      },
      modelInfoLeft: {
        flex: 1,
      },
      modelName: {
        ...typography.caption,
        color: colors.text,
      },
      tokenBreakdown: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: spacing.xs,
        gap: spacing.sm,
      },
      tokenBreakdownText: {
        ...typography.caption,
        color: colors.textSecondary,
      },
      tokenBreakdownSeparator: {
        ...typography.caption,
        color: colors.border,
        marginHorizontal: spacing.xs,
      },
      modelUsage: {
        ...typography.caption,
        color: colors.textSecondary,
        fontWeight: '600',
      },
      modelTokenDetail: {
        ...typography.caption,
        color: colors.textSecondary,
        fontSize: 11,
        marginTop: 2,
      },
      modelCost: {
        ...typography.caption,
        color: colors.primary,
        fontWeight: '700',
        marginLeft: spacing.md,
      },
      totalCostContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.md,
        marginTop: spacing.sm,
        borderTopWidth: 2,
        borderTopColor: colors.primary,
        backgroundColor: `${colors.primary}10`, // 10% opacity
      },
      totalCostLabel: {
        ...typography.body,
        color: colors.text,
        fontWeight: '700',
      },
      totalCostValue: {
        ...typography.body,
        color: colors.primary,
        fontWeight: '700',
        fontSize: 16,
      },
    }),
    [colors, spacing, typography]
  );
  /* eslint-enable react-native/no-unused-styles */

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>読み込み中...</Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* サブスクリプションセクション */}
        {renderSection('サブスクリプション')}

        <TouchableOpacity
          style={styles.subscriptionButton}
          onPress={() => navigation.navigate('Subscription')}
        >
          <View style={styles.subscriptionButtonContent}>
            <Text style={styles.subscriptionButtonTitle}>
              現在のプラン: {SUBSCRIPTION_PLANS[tier].displayName}
            </Text>
            <Text style={styles.subscriptionButtonSubtitle}>
              {status === 'active' || status === 'trial'
                ? 'タップしてプランを管理'
                : 'プランをアップグレード'}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={24}
            color={colors.textSecondary}
            style={styles.subscriptionIcon}
          />
        </TouchableOpacity>

        {/* 月間トークン使用量 */}
        <View style={styles.usageContainer}>
          <Text style={styles.usageTitle}>月間トークン使用量</Text>
          <View style={styles.usageStats}>
            <Text style={styles.usageText}>
              {tokenUsage.current.toLocaleString()} / {tokenUsage.max === -1 ? '無制限' : tokenUsage.max.toLocaleString()} トークン
            </Text>
            {tokenUsage.max !== -1 && (
              <Text style={[styles.usagePercentage, { color: getUsageColor(tokenUsage.percentage) }]}>
                {tokenUsage.percentage.toFixed(1)}%
              </Text>
            )}
          </View>
          {/* 入力・出力トークンの内訳 */}
          <View style={styles.tokenBreakdown}>
            <Text style={styles.tokenBreakdownText}>
              入力: {settings.usage.monthlyInputTokens.toLocaleString()}
            </Text>
            <Text style={styles.tokenBreakdownSeparator}>|</Text>
            <Text style={styles.tokenBreakdownText}>
              出力: {settings.usage.monthlyOutputTokens.toLocaleString()}
            </Text>
          </View>
          {tokenUsage.max !== -1 && (
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${Math.min(tokenUsage.percentage, 100)}%`,
                    backgroundColor: getUsageColor(tokenUsage.percentage),
                  },
                ]}
              />
            </View>
          )}

          {/* モデル別の内訳 */}
          {Object.keys(settings.usage.monthlyTokensByModel).length > 0 && (
            <>
              <Text style={styles.modelBreakdownTitle}>モデル別の内訳</Text>
              {Object.entries(settings.usage.monthlyTokensByModel).map(([modelId, usage]) => {
                const totalTokens = usage.inputTokens + usage.outputTokens;
                // 開発時のみコスト情報を取得
                const modelCost = __DEV__ && costInfo
                  ? costInfo.costByModel.find(m => m.modelId === modelId)
                  : null;
                return (
                  <View key={modelId} style={styles.modelBreakdownItem}>
                    <View style={styles.modelInfoLeft}>
                      <Text style={styles.modelName}>{modelId}</Text>
                      <Text style={styles.modelUsage}>
                        合計: {totalTokens.toLocaleString()}
                      </Text>
                      <Text style={styles.modelTokenDetail}>
                        入力: {usage.inputTokens.toLocaleString()} | 出力: {usage.outputTokens.toLocaleString()}
                      </Text>
                    </View>
                    {__DEV__ && modelCost && (
                      <Text style={styles.modelCost}>{modelCost.formattedCost}</Text>
                    )}
                  </View>
                );
              })}
              {/* 開発時のみ総コストを表示 */}
              {__DEV__ && costInfo && costInfo.totalCost > 0 && (
                <View style={styles.totalCostContainer}>
                  <Text style={styles.totalCostLabel}>今月のコスト</Text>
                  <Text style={styles.totalCostValue}>{costInfo.formattedTotalCost}</Text>
                </View>
              )}
            </>
          )}
        </View>

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

        {settings.llmEnabled && (
          <>
            {renderSection('LLM設定')}

            {isLoadingProviders ? (
              <ListItem.Container>
                <View style={styles.loadingContent}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingText}>LLMプロバイダーを読み込み中...</Text>
                </View>
              </ListItem.Container>
            ) : (
              <>
                {renderPicker(
                  'LLMプロバイダー',
                  settings.llmProvider,
                  Object.entries(llmProviders).map(([key, provider]) => ({
                    label: `${provider.name}${provider.status === 'unavailable' ? ' (利用不可)' : ''}`,
                    value: key,
                  })),
                  (value) => {
                    const updates: any = { llmProvider: value };
                    // プロバイダー変更時はデフォルトモデルも設定
                    if (llmProviders[value]) {
                      updates.llmModel = llmProviders[value].defaultModel;
                    }
                    updateSettings(updates);
                  }
                )}

                {settings.llmProvider && llmProviders[settings.llmProvider] && (
                  renderPicker(
                    'モデル',
                    settings.llmModel,
                    llmProviders[settings.llmProvider].models.map((model: string) => ({
                      label: model,
                      value: model,
                    })),
                    (value) => updateSettings({ llmModel: value })
                  )
                )}

                <ListItem.Container>
                  {/* eslint-disable-next-line react-native/no-raw-text */}
                  <ListItem.Title>ノートの文脈情報をLLMに送信</ListItem.Title>
                  <Switch
                    value={settings.sendFileContextToLLM}
                    onValueChange={(value: boolean) => updateSettings({ sendFileContextToLLM: value })}
                  />
                </ListItem.Container>
              </>
            )}
          </>
        )}

        <Text style={styles.infoText}>
          その他の設定項目は今後のアップデートで追加予定です。
        </Text>

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
  );
}

export default SettingsScreen;