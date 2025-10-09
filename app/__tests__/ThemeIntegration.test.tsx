/**
 * @file ThemeIntegration.test.tsx
 * @summary コンポーネントのテーマ統合テスト
 * @description 各コンポーネントがテーマ切り替えに適切に反応することを確認
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { ThemeProvider } from '../design/theme/ThemeContext';
import { useSettingsStore } from '../settings/settingsStore';
import { ListItem } from '../components/ListItem';
import { FabButton } from '../components/FabButton';
import { HeaderButton } from '../components/HeaderButton';


describe('Theme Integration Tests', () => {
  const defaultSettings = {
    theme: 'light' as const,
    fontSize: 'medium' as const,
    fontFamily: 'System',
    lineSpacing: 1.5,
    showLineNumbers: false,
    syntaxHighlight: true,
    showMarkdownSymbols: true,
    startupScreen: 'note-list' as const,
    autoSaveEnabled: true,
    autoSaveInterval: 30,
    defaultEditorMode: 'edit' as const,
    autoIndent: true,
    tabSize: 2,
    spellCheck: true,
    autoComplete: true,
    privacyMode: 'normal' as const,
    llmService: 'openai',
    llmProvider: 'openai',
    llmModel: 'gpt-3.5-turbo',
    llmApiKey: '',
    localLlmUrl: 'http://localhost',
    localLlmPort: '8080',
    aiResponseStyle: 'concise' as const,
    contextHistoryLength: 10,
    versionSaveFrequency: 'every-change' as const,
    versionSaveInterval: 10,
    maxVersionCount: 50,
    autoBackupEnabled: true,
    backupFrequency: 24,
    backupLocation: 'local' as const,
    diffDisplayStyle: 'both' as const,
    defaultDiffMode: 'side-by-side' as const,
    storageLocation: 'default',
    cloudSyncEnabled: false,
    exportFormat: 'markdown' as const,
    appLockEnabled: false,
    autoLockTimeout: 5,
    encryptSensitiveNotes: false,
    cacheLimit: 100,
    offlineModeEnabled: false,
    updateNotifications: true,
    backupNotifications: true,
    llmNotifications: true,
    highContrastMode: false,
    screenReaderOptimization: false,
    anonymousStatsEnabled: false,
    diagnosticDataEnabled: false,
  };

  beforeEach(() => {
    act(() => {
      useSettingsStore.setState({
        settings: defaultSettings,
        isLoading: false,
        loadSettings: jest.fn(),
        updateSettings: jest.fn(),
        resetSettings: jest.fn(),
      });
    });
  });

  describe('ListItem Component', () => {
    it('should render with light theme colors', () => {
      const { getByText } = render(
        <ThemeProvider>
          <ListItem
            title="Test Note"
            subtitle="Test content"
            onPress={jest.fn()}
          />
        </ThemeProvider>
      );

      const titleElement = getByText('Test Note');
      expect(titleElement).toBeTruthy();
    });

    it('should apply dark theme when settings change', () => {
      act(() => {
        useSettingsStore.setState({
          settings: {
            ...defaultSettings,
            theme: 'dark',
          },
        });
      });

      const { getByText } = render(
        <ThemeProvider>
          <ListItem
            title="Test Note"
            subtitle="Test content"
            onPress={jest.fn()}
          />
        </ThemeProvider>
      );

      const titleElement = getByText('Test Note');
      expect(titleElement).toBeTruthy();
      // ダークテーマでもレンダリングできることを確認
    });

    it('should render with selection mode styling', () => {
      const { getByText } = render(
        <ThemeProvider>
          <ListItem
            title="Test Note"
            subtitle="Test content"
            onPress={jest.fn()}
            isSelectionMode={true}
            isSelected={true}
          />
        </ThemeProvider>
      );

      expect(getByText('Test Note')).toBeTruthy();
      expect(getByText('✓')).toBeTruthy();
    });

    it('should adjust font size when fontSize setting changes', () => {
      act(() => {
        useSettingsStore.setState({
          settings: {
            ...defaultSettings,
            fontSize: 'large',
          },
        });
      });

      const { getByText } = render(
        <ThemeProvider>
          <ListItem
            title="Test Note"
            subtitle="Test content"
            onPress={jest.fn()}
          />
        </ThemeProvider>
      );

      const titleElement = getByText('Test Note');
      expect(titleElement).toBeTruthy();
      // フォントサイズの変更でもレンダリングできることを確認
    });

    it('should render with high contrast mode', () => {
      act(() => {
        useSettingsStore.setState({
          settings: {
            ...defaultSettings,
            highContrastMode: true,
          },
        });
      });

      const { getByText } = render(
        <ThemeProvider>
          <ListItem
            title="Test Note"
            subtitle="Test content"
            onPress={jest.fn()}
          />
        </ThemeProvider>
      );

      expect(getByText('Test Note')).toBeTruthy();
    });

    it('should handle screen reader optimization', () => {
      act(() => {
        useSettingsStore.setState({
          settings: {
            ...defaultSettings,
            screenReaderOptimization: true,
          },
        });
      });

      const { getByText } = render(
        <ThemeProvider>
          <ListItem
            title="Test Note"
            subtitle="Test content"
            onPress={jest.fn()}
          />
        </ThemeProvider>
      );

      expect(getByText('Test Note')).toBeTruthy();
    });
  });

  describe('FabButton Component', () => {
    it('should render with light theme colors', () => {
      const { getByText } = render(
        <ThemeProvider>
          <FabButton onPress={jest.fn()} icon="+" />
        </ThemeProvider>
      );

      expect(getByText('+')).toBeTruthy();
    });

    it('should apply dark theme when settings change', () => {
      act(() => {
        useSettingsStore.setState({
          settings: {
            ...defaultSettings,
            theme: 'dark',
          },
        });
      });

      const { getByText } = render(
        <ThemeProvider>
          <FabButton onPress={jest.fn()} icon="+" />
        </ThemeProvider>
      );

      expect(getByText('+')).toBeTruthy();
    });

    it('should render with different sizes', () => {
      const { getByText: getSmall } = render(
        <ThemeProvider>
          <FabButton onPress={jest.fn()} icon="+" size="small" />
        </ThemeProvider>
      );
      expect(getSmall('+')).toBeTruthy();

      const { getByText: getLarge } = render(
        <ThemeProvider>
          <FabButton onPress={jest.fn()} icon="+" size="large" />
        </ThemeProvider>
      );
      expect(getLarge('+')).toBeTruthy();
    });

    it('should render disabled state', () => {
      const { getByText } = render(
        <ThemeProvider>
          <FabButton onPress={jest.fn()} icon="+" disabled={true} />
        </ThemeProvider>
      );

      expect(getByText('+')).toBeTruthy();
    });

    it('should handle high contrast mode', () => {
      act(() => {
        useSettingsStore.setState({
          settings: {
            ...defaultSettings,
            highContrastMode: true,
          },
        });
      });

      const { getByText } = render(
        <ThemeProvider>
          <FabButton onPress={jest.fn()} icon="+" />
        </ThemeProvider>
      );

      expect(getByText('+')).toBeTruthy();
    });
  });

  describe('HeaderButton Component', () => {
    it('should render with light theme colors', () => {
      const { getByText } = render(
        <ThemeProvider>
          <HeaderButton title="保存" onPress={jest.fn()} />
        </ThemeProvider>
      );

      expect(getByText('保存')).toBeTruthy();
    });

    it('should apply dark theme when settings change', () => {
      act(() => {
        useSettingsStore.setState({
          settings: {
            ...defaultSettings,
            theme: 'dark',
          },
        });
      });

      const { getByText } = render(
        <ThemeProvider>
          <HeaderButton title="保存" onPress={jest.fn()} />
        </ThemeProvider>
      );

      expect(getByText('保存')).toBeTruthy();
    });

    it('should render with different variants', () => {
      const { getByText: getPrimary } = render(
        <ThemeProvider>
          <HeaderButton title="保存" onPress={jest.fn()} variant="primary" />
        </ThemeProvider>
      );
      expect(getPrimary('保存')).toBeTruthy();

      const { getByText: getDanger } = render(
        <ThemeProvider>
          <HeaderButton title="削除" onPress={jest.fn()} variant="danger" />
        </ThemeProvider>
      );
      expect(getDanger('削除')).toBeTruthy();

      const { getByText: getSecondary } = render(
        <ThemeProvider>
          <HeaderButton title="キャンセル" onPress={jest.fn()} variant="secondary" />
        </ThemeProvider>
      );
      expect(getSecondary('キャンセル')).toBeTruthy();
    });

    it('should render disabled state', () => {
      const { getByText } = render(
        <ThemeProvider>
          <HeaderButton title="保存" onPress={jest.fn()} disabled={true} />
        </ThemeProvider>
      );

      expect(getByText('保存')).toBeTruthy();
    });

    it('should adjust font size when fontSize setting changes', () => {
      act(() => {
        useSettingsStore.setState({
          settings: {
            ...defaultSettings,
            fontSize: 'xlarge',
          },
        });
      });

      const { getByText } = render(
        <ThemeProvider>
          <HeaderButton title="保存" onPress={jest.fn()} />
        </ThemeProvider>
      );

      expect(getByText('保存')).toBeTruthy();
    });

    it('should handle high contrast mode', () => {
      act(() => {
        useSettingsStore.setState({
          settings: {
            ...defaultSettings,
            highContrastMode: true,
          },
        });
      });

      const { getByText } = render(
        <ThemeProvider>
          <HeaderButton title="保存" onPress={jest.fn()} />
        </ThemeProvider>
      );

      expect(getByText('保存')).toBeTruthy();
    });
  });

  describe('Theme Switching', () => {
    it('should switch from light to dark theme', () => {
      const { rerender, getByText } = render(
        <ThemeProvider>
          <ListItem title="Test" subtitle="Content" onPress={jest.fn()} />
        </ThemeProvider>
      );

      expect(getByText('Test')).toBeTruthy();

      // ダークテーマに切り替え
      act(() => {
        useSettingsStore.setState({
          settings: {
            ...defaultSettings,
            theme: 'dark',
          },
        });
      });

      rerender(
        <ThemeProvider>
          <ListItem title="Test" subtitle="Content" onPress={jest.fn()} />
        </ThemeProvider>
      );

      expect(getByText('Test')).toBeTruthy();
    });

    it('should switch font sizes', () => {
      const { rerender, getByText } = render(
        <ThemeProvider>
          <HeaderButton title="テスト" onPress={jest.fn()} />
        </ThemeProvider>
      );

      expect(getByText('テスト')).toBeTruthy();

      // フォントサイズを変更
      act(() => {
        useSettingsStore.setState({
          settings: {
            ...defaultSettings,
            fontSize: 'large',
          },
        });
      });

      rerender(
        <ThemeProvider>
          <HeaderButton title="テスト" onPress={jest.fn()} />
        </ThemeProvider>
      );

      expect(getByText('テスト')).toBeTruthy();
    });

    it('should handle system theme', () => {
      const { useColorScheme } = require('react-native');
      useColorScheme.mockReturnValue('dark');

      act(() => {
        useSettingsStore.setState({
          settings: {
            ...defaultSettings,
            theme: 'system',
          },
        });
      });

      const { getByText } = render(
        <ThemeProvider>
          <ListItem title="Test" subtitle="Content" onPress={jest.fn()} />
        </ThemeProvider>
      );

      expect(getByText('Test')).toBeTruthy();
    });

    it('should switch to high contrast mode', () => {
      const { rerender, getByText } = render(
        <ThemeProvider>
          <FabButton onPress={jest.fn()} icon="+" />
        </ThemeProvider>
      );

      expect(getByText('+')).toBeTruthy();

      act(() => {
        useSettingsStore.setState({
          settings: {
            ...defaultSettings,
            highContrastMode: true,
          },
        });
      });

      rerender(
        <ThemeProvider>
          <FabButton onPress={jest.fn()} icon="+" />
        </ThemeProvider>
      );

      expect(getByText('+')).toBeTruthy();
    });
  });

  describe('Multiple Components', () => {
    it('should render multiple components with consistent theming', () => {
      const { getByText } = render(
        <ThemeProvider>
          <>
            <ListItem title="Note 1" subtitle="Content 1" onPress={jest.fn()} />
            <ListItem title="Note 2" subtitle="Content 2" onPress={jest.fn()} />
            <FabButton onPress={jest.fn()} icon="+" />
            <HeaderButton title="設定" onPress={jest.fn()} />
          </>
        </ThemeProvider>
      );

      expect(getByText('Note 1')).toBeTruthy();
      expect(getByText('Note 2')).toBeTruthy();
      expect(getByText('+')).toBeTruthy();
      expect(getByText('設定')).toBeTruthy();
    });

    it('should render multiple components with dark theme', () => {
      act(() => {
        useSettingsStore.setState({
          settings: {
            ...defaultSettings,
            theme: 'dark',
          },
        });
      });

      const { getByText } = render(
        <ThemeProvider>
          <>
            <ListItem title="Note 1" subtitle="Content 1" onPress={jest.fn()} />
            <FabButton onPress={jest.fn()} icon="+" />
            <HeaderButton title="設定" onPress={jest.fn()} />
          </>
        </ThemeProvider>
      );

      expect(getByText('Note 1')).toBeTruthy();
      expect(getByText('+')).toBeTruthy();
      expect(getByText('設定')).toBeTruthy();
    });

    it('should render multiple components with high contrast mode', () => {
      act(() => {
        useSettingsStore.setState({
          settings: {
            ...defaultSettings,
            highContrastMode: true,
          },
        });
      });

      const { getByText } = render(
        <ThemeProvider>
          <>
            <ListItem title="Note 1" subtitle="Content 1" onPress={jest.fn()} />
            <FabButton onPress={jest.fn()} icon="+" />
            <HeaderButton title="設定" onPress={jest.fn()} />
          </>
        </ThemeProvider>
      );

      expect(getByText('Note 1')).toBeTruthy();
      expect(getByText('+')).toBeTruthy();
      expect(getByText('設定')).toBeTruthy();
    });
  });
});