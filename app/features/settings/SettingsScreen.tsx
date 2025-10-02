/**
 * @file SettingsScreen.tsx
 * @summary このファイルは、アプリケーションの設定画面をレンダリングします。
 * @responsibility ユーザーがアプリケーションの各種設定（表示、動作、LLM関連など）を閲覧・変更できるUIを提供し、設定の永続化と更新を管理します。
 */
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useSettingsStore } from '../../store/settingsStore';
import { colors, spacing, typography } from '../../utils/commonStyles';
function SettingsScreen() {
  const { settings, loadSettings, updateSettings, isLoading } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, []);

  const renderSection = (title: string) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );

  const renderOption = (
    label: string,
    value: string | boolean | number,
    options?: { label: string; value: any }[],
    onPress?: () => void
  ) => (
    <View style={styles.optionContainer}>
      <Text style={styles.optionLabel}>{label}</Text>
      {typeof value === 'boolean' ? (
        <Switch
          value={value}
          onValueChange={(newValue) => {
            if (onPress) onPress();
          }}
        />
      ) : (
        <TouchableOpacity onPress={onPress}>
          <Text style={styles.optionValue}>{String(value)}</Text>
        </TouchableOpacity>
      )}
    </View>
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
                              label === 'プライバシーモード' ? 'privacyMode' : '';
              if (updateKey) {
                updateSettings({ [updateKey]: option.value });
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
        <Text style={styles.sectionTitle}>現在設定可能な項目</Text>
        <Text style={styles.infoText}>
          その他の設定項目は今後のアップデートで追加予定です。
        </Text>
        
        {/* 実装済みの項目があればここに表示 */}
        
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
  optionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  optionValue: {
    ...typography.body,
    color: colors.primary,
  },
  pickerContainer: {
    backgroundColor: colors.background,
    padding: spacing.lg,
    borderRadius: 8,
    marginBottom: spacing.sm,
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
});

export default SettingsScreen;