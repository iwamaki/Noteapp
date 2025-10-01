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
        {/* 1. 表示設定 */}
        {renderSection('表示設定')}
        {renderPicker('テーマ (未実装)', settings.theme, [
          { label: 'ライト', value: 'light' },
          { label: 'ダーク', value: 'dark' },
          { label: 'システム', value: 'system' },
        ])}
        {renderPicker('フォントサイズ (未実装)', settings.fontSize, [
          { label: '小', value: 'small' },
          { label: '中', value: 'medium' },
          { label: '大', value: 'large' },
          { label: '特大', value: 'xlarge' },
        ])}
        {renderOption(
          '行番号を表示 (未実装)',
          settings.showLineNumbers,
          undefined,
          () => updateSettings({ showLineNumbers: !settings.showLineNumbers })
        )}
        {renderOption(
          'シンタックスハイライト (未実装)',
          settings.syntaxHighlight,
          undefined,
          () => updateSettings({ syntaxHighlight: !settings.syntaxHighlight })
        )}
        {renderOption(
          'マークダウン記号を表示 (未実装)',
          settings.showMarkdownSymbols,
          undefined,
          () => updateSettings({ showMarkdownSymbols: !settings.showMarkdownSymbols })
        )}

        {/* 2. 動作設定 */}
        {renderSection('動作設定')}
        {renderPicker('デフォルトエディタモード (未実装)', settings.defaultEditorMode, [
          { label: '編集', value: 'edit' },
          { label: 'プレビュー', value: 'preview' },
          { label: '分割', value: 'split' },
        ])}
        {renderOption(
          '自動保存 (未実装)',
          settings.autoSaveEnabled,
          undefined,
          () => updateSettings({ autoSaveEnabled: !settings.autoSaveEnabled })
        )}
        {renderOption(
          '自動インデント (未実装)',
          settings.autoIndent,
          undefined,
          () => updateSettings({ autoIndent: !settings.autoIndent })
        )}
        {renderOption(
          'スペルチェック (未実装)',
          settings.spellCheck,
          undefined,
          () => updateSettings({ spellCheck: !settings.spellCheck })
        )}
        {renderOption(
          '自動補完 (未実装)',
          settings.autoComplete,
          undefined,
          () => updateSettings({ autoComplete: !settings.autoComplete })
        )}

        {/* 3. LLM（AI）設定 */}
        {renderSection('LLM（AI）設定 (未実装)')}
        {renderPicker('プライバシーモード (未実装)', settings.privacyMode, [
          { label: '通常', value: 'normal' },
          { label: 'プライベート', value: 'private' },
        ])}

        {/* 4. システムと通知 */}
        {renderSection('システムと通知')}
        {renderOption(
          'バージョン更新通知 (未実装)',
          settings.updateNotifications,
          undefined,
          () => updateSettings({ updateNotifications: !settings.updateNotifications })
        )}
        {renderOption(
          'バックアップ完了通知 (未実装)',
          settings.backupNotifications,
          undefined,
          () => updateSettings({ backupNotifications: !settings.backupNotifications })
        )}
        {renderOption(
          'LLM処理完了通知 (未実装)',
          settings.llmNotifications,
          undefined,
          () => updateSettings({ llmNotifications: !settings.llmNotifications })
        )}
        {renderOption(
          '高コントラストモード (未実装)',
          settings.highContrastMode,
          undefined,
          () => updateSettings({ highContrastMode: !settings.highContrastMode })
        )}

        {/* リセットボタン */}
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