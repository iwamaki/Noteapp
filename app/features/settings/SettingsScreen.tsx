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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSettingsStore } from '../../store/settingsStore';
import { useTheme } from '../../theme/ThemeContext';
import { useCustomHeader } from '../../components/CustomHeader';
import APIService from '../../services/api';
import { LLMProvider } from '../../services/llmService';

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
        title: <Text style={{ color: colors.text }}>設定</Text>,
        leftButtons: [{ title: '\u2190', onPress: () => navigation.goBack() }],
      })
    );
  }, [navigation, colors]);

  const renderSection = (title: string) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );

  const renderPicker = (
    label: string,
    value: string,
    options: { label: string; value: string }[]
  ) => (
    <View style={styles.pickerContainer}>
      <Text style={styles.optionLabel}>{label}</Text>
      <View style={styles.pickerButtons}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.pickerButton,
              value === option.value && styles.pickerButtonActive,
            ]}
            onPress={() => {
              const updateKey = label === 'テーマ' ? 'theme' :
                              label === 'フォントサイズ' ? 'fontSize' :
                              label === 'デフォルトエディタモード' ? 'defaultEditorMode' :
                              label === 'プライバシーモード' ? 'privacyMode' :
                              label === 'LLMプロバイダー' ? 'llmProvider' :
                              label === 'モデル' ? 'llmModel' : '';
              if (updateKey) {
                const updates: any = { [updateKey]: option.value };
                // プロバイダー変更時はデフォルトモデルも設定
                if (updateKey === 'llmProvider' && llmProviders[option.value]) {
                  updates.llmModel = llmProviders[option.value].defaultModel;
                }
                updateSettings(updates);
              }
            }}
          >
            <Text
              style={[
                styles.pickerButtonText,
                value === option.value && styles.pickerButtonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
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
    pickerContainer: {
      backgroundColor: colors.background,
      padding: spacing.lg,
      borderRadius: 8,
      marginBottom: spacing.sm,
    },
    optionLabel: {
      ...typography.body,
      color: colors.text,
      flex: 1,
    },
    pickerButtons: {
      flexDirection: 'row',
      marginTop: spacing.md,
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    pickerButton: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: 6,
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pickerButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    pickerButtonText: {
      ...typography.body,
      color: colors.text,
    },
    pickerButtonTextActive: {
      color: colors.background,
      fontWeight: '600',
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
    loadingContainer: {
      backgroundColor: colors.background,
      padding: spacing.lg,
      borderRadius: 8,
      marginBottom: spacing.sm,
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
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {renderSection('表示設定')}

        {renderPicker('テーマ', settings.theme, [
          { label: 'ライト', value: 'light' },
          { label: 'ダーク', value: 'dark' },
          { label: 'システム', value: 'system' },
        ])}

        {renderPicker('フォントサイズ', settings.fontSize, [
          { label: '小', value: 'small' },
          { label: '中', value: 'medium' },
          { label: '大', value: 'large' },
          { label: '特大', value: 'xlarge' },
        ])}

        {renderSection('LLM設定')}

        {isLoadingProviders ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>LLMプロバイダーを読み込み中...</Text>
          </View>
        ) : (
          <>
            {renderPicker(
              'LLMプロバイダー',
              settings.llmProvider,
              Object.entries(llmProviders).map(([key, provider]) => ({
                label: `${provider.name}${provider.status === 'unavailable' ? ' (利用不可)' : ''}`,
                value: key,
              }))
            )}

            {settings.llmProvider && llmProviders[settings.llmProvider] && (
              renderPicker(
                'モデル',
                settings.llmModel,
                llmProviders[settings.llmProvider].models.map(model => ({
                  label: model,
                  value: model,
                }))
              )
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