/**
 * @file SettingsScreen.tsx
 * @summary このファイルは、アプリケーションの設定画面をレンダリングします。
 * @responsibility ユーザーがアプリケーションの各種設定（表示、動作、LLM関連など）を閲覧・変更できるUIを提供し、設定の永続化と更新を管理します。
 */
import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSettingsStore } from './settingsStore';
import { useTheme } from '../design/theme/ThemeContext';
import { useCustomHeader } from '../components/CustomHeader';
import APIService from '../features/chat/llmService/api';
import { LLMProvider } from '../features/chat/llmService/types/types';
import { Ionicons } from '@expo/vector-icons';
import { ListItem } from '../components/ListItem';

function SettingsScreen() {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation();
  const { createHeaderConfig } = useCustomHeader();
  const { settings, loadSettings, updateSettings, isLoading } = useSettingsStore();
  const [llmProviders, setLlmProviders] = useState<Record<string, LLMProvider>>({});
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);

  useEffect(() => {
    loadSettings();
    loadLLMProviders();
  }, []);

  const loadLLMProviders = async () => {
    try {
      setIsLoadingProviders(true);
      const providers = await APIService.loadLLMProviders();
      setLlmProviders(providers);
    } catch (error) {
      console.error('Failed to load LLM providers:', error);
    } finally {
      setIsLoadingProviders(false);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions(
      createHeaderConfig({
        title: <Text style={{ color: colors.text, fontSize: typography.header.fontSize }}>設定</Text>,
        leftButtons: [
          {
            icon: <Ionicons name="arrow-back-outline" size={24} color={colors.text} />,
            onPress: () => navigation.goBack(),
          },
        ],
      })
    );
  }, [navigation, colors, typography]);

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

  // スタイルの定義
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.secondary,
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
  });

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
              <ListItem.Title><Text style={{...typography.body, color: colors.text}}>ノートコンテキストをLLMに送信</Text></ListItem.Title>
              <Switch
                value={settings.sendFileContextToLLM}
                onValueChange={(value: boolean) => updateSettings({ sendFileContextToLLM: value })}
              />
            </ListItem.Container>

            {settings.sendFileContextToLLM && renderPicker(
              'コンテキスト階層の深さ',
              String(settings.llmContextMaxDepth),
              [
                { label: '1層 (現在)', value: '1' },
                { label: '2層', value: '2' },
                { label: '3層', value: '3' },
                { label: '5層', value: '5' },
                { label: '全階層', value: '-1' },
              ],
              (value) => updateSettings({ llmContextMaxDepth: Number(value) })
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