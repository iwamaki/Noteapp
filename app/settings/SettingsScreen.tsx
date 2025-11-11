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
  Alert,
} from 'react-native';
import { useSettingsStore } from './settingsStore';
import { useTheme } from '../design/theme/ThemeContext';
import { useSettingsHeader } from './hooks/useSettingsHeader';
import { ListItem } from '../components/ListItem';
import { TokenUsageSection } from './components/TokenUsageSection';
import { MainContainer } from '../components/MainContainer';

function SettingsScreen() {
  const { colors, spacing, typography } = useTheme();
  const { settings, loadSettings, updateSettings, isLoading, checkAndResetMonthlyUsageIfNeeded } = useSettingsStore();

  useEffect(() => {
    loadSettings();
    // 月次使用量のリセットチェック（月が変わったらリセット）
    checkAndResetMonthlyUsageIfNeeded();
  }, []);

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
    }),
    [colors, spacing, typography]
  );
  /* eslint-enable react-native/no-unused-styles */

  return (
    <MainContainer isLoading={isLoading}>
      <ScrollView style={styles.scrollView}>
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
        <TokenUsageSection renderSection={renderSection} />

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