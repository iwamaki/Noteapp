/**
 * @file ThemeContext.test.tsx
 * @summary ThemeContextとテーマ切り替え機能のテスト
 */
import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { ThemeProvider, useTheme } from '../design/theme/ThemeContext';
import { useSettingsStore } from '../settings/settingsStore';


describe('ThemeContext', () => {
  beforeEach(() => {
    // 各テスト前にストアをリセット
    useSettingsStore.setState({
      settings: {
        theme: 'light',
        fontSize: 'medium',
        fontFamily: 'System',
        lineSpacing: 1.5,
        showLineNumbers: false,
        syntaxHighlight: true,
        showMarkdownSymbols: true,
        startupScreen: 'note-list',
        autoSaveEnabled: true,
        autoSaveInterval: 30,
        defaultEditorMode: 'edit',
        autoIndent: true,
        tabSize: 2,
        spellCheck: true,
        autoComplete: true,
        privacyMode: 'normal',
        llmService: 'openai',
        llmProvider: 'openai',
        llmModel: 'gpt-4',
        llmApiKey: '',
        localLlmUrl: 'http://localhost',
        localLlmPort: '8080',
        aiResponseStyle: 'concise',
        contextHistoryLength: 10,
        versionSaveFrequency: 'every-change',
        versionSaveInterval: 10,
        maxVersionCount: 50,
        autoBackupEnabled: true,
        backupFrequency: 24,
        backupLocation: 'local',
        diffDisplayStyle: 'both',
        defaultDiffMode: 'side-by-side',
        storageLocation: 'default',
        cloudSyncEnabled: false,
        exportFormat: 'markdown',
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
      },
      isLoading: false,
      loadSettings: jest.fn(),
      updateSettings: jest.fn(),
      resetSettings: jest.fn(),
    });
  });

  describe('ThemeProvider', () => {
    it('should provide light theme by default', () => {
      const TestComponent = () => {
        const { colors } = useTheme();
        return <Text testID="text">{colors.background}</Text>;
      };

      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(getByTestId('text').props.children).toBe('#fff');
    });

    it('should throw error when useTheme is used outside ThemeProvider', () => {
      const TestComponent = () => {
        const { colors } = useTheme();
        return <Text>{colors.background}</Text>;
      };

      // エラーログを抑制
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => render(<TestComponent />)).toThrow(
        'useTheme must be used within ThemeProvider'
      );

      console.error = originalError;
    });
  });

  describe('Light Theme', () => {
    it('should have correct light theme colors', () => {
      const TestComponent = () => {
        const { colors } = useTheme();
        return (
          <View>
            <Text testID="primary">{colors.primary}</Text>
            <Text testID="background">{colors.background}</Text>
            <Text testID="text">{colors.text}</Text>
            <Text testID="textSecondary">{colors.textSecondary}</Text>
          </View>
        );
      };

      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(getByTestId('primary').props.children).toBe('#007AFF');
      expect(getByTestId('background').props.children).toBe('#fff');
      expect(getByTestId('text').props.children).toBe('#000');
      expect(getByTestId('textSecondary').props.children).toBe('#666');
    });
  });

  describe('Dark Theme', () => {
    it('should have correct dark theme colors', () => {
      // ダークテーマに設定
      useSettingsStore.setState({
        settings: {
          ...useSettingsStore.getState().settings,
          theme: 'dark',
        },
      });

      const TestComponent = () => {
        const { colors } = useTheme();
        return (
          <View>
            <Text testID="primary">{colors.primary}</Text>
            <Text testID="background">{colors.background}</Text>
            <Text testID="text">{colors.text}</Text>
            <Text testID="textSecondary">{colors.textSecondary}</Text>
          </View>
        );
      };

      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(getByTestId('primary').props.children).toBe('#0A84FF');
      expect(getByTestId('background').props.children).toBe('#000');
      expect(getByTestId('text').props.children).toBe('#fff');
      expect(getByTestId('textSecondary').props.children).toBe('#98989D');
    });
  });

  describe('System Theme', () => {
    it('should follow system color scheme when theme is "system" - dark', () => {
      const { useColorScheme } = require('react-native');
      useColorScheme.mockReturnValue('dark');

      useSettingsStore.setState({
        settings: {
          ...useSettingsStore.getState().settings,
          theme: 'system',
        },
      });

      const TestComponent = () => {
        const { colors } = useTheme();
        return <Text testID="background">{colors.background}</Text>;
      };

      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // システムがダークなのでダークテーマの背景色になるべき
      expect(getByTestId('background').props.children).toBe('#000');
    });

    it('should follow system color scheme when theme is "system" - light', () => {
      const { useColorScheme } = require('react-native');
      useColorScheme.mockReturnValue('light');

      useSettingsStore.setState({
        settings: {
          ...useSettingsStore.getState().settings,
          theme: 'system',
        },
      });

      const TestComponent = () => {
        const { colors } = useTheme();
        return <Text testID="background">{colors.background}</Text>;
      };

      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // システムがライトなのでライトテーマの背景色になるべき
      expect(getByTestId('background').props.children).toBe('#fff');
    });
  });

  describe('Font Size', () => {
    it('should adjust typography based on fontSize setting - small', () => {
      useSettingsStore.setState({
        settings: {
          ...useSettingsStore.getState().settings,
          fontSize: 'small',
        },
      });

      const TestComponent = () => {
        const { typography } = useTheme();
        return (
          <View>
            <Text testID="title">{typography.title.fontSize}</Text>
            <Text testID="body">{typography.body.fontSize}</Text>
          </View>
        );
      };

      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // small: 0.875倍
      expect(getByTestId('title').props.children).toBe(Math.round(18 * 0.875)); // 16
      expect(getByTestId('body').props.children).toBe(Math.round(14 * 0.875)); // 12
    });

    it('should adjust typography based on fontSize setting - medium', () => {
      useSettingsStore.setState({
        settings: {
          ...useSettingsStore.getState().settings,
          fontSize: 'medium',
        },
      });

      const TestComponent = () => {
        const { typography } = useTheme();
        return (
          <View>
            <Text testID="title">{typography.title.fontSize}</Text>
            <Text testID="body">{typography.body.fontSize}</Text>
          </View>
        );
      };

      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // medium: 1.0倍
      expect(getByTestId('title').props.children).toBe(18);
      expect(getByTestId('body').props.children).toBe(14);
    });

    it('should adjust typography based on fontSize setting - large', () => {
      useSettingsStore.setState({
        settings: {
          ...useSettingsStore.getState().settings,
          fontSize: 'large',
        },
      });

      const TestComponent = () => {
        const { typography } = useTheme();
        return (
          <View>
            <Text testID="title">{typography.title.fontSize}</Text>
            <Text testID="body">{typography.body.fontSize}</Text>
          </View>
        );
      };

      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // large: 1.125倍
      expect(getByTestId('title').props.children).toBe(Math.round(18 * 1.125)); // 20
      expect(getByTestId('body').props.children).toBe(Math.round(14 * 1.125)); // 16
    });

    it('should adjust typography based on fontSize setting - xlarge', () => {
      useSettingsStore.setState({
        settings: {
          ...useSettingsStore.getState().settings,
          fontSize: 'xlarge',
        },
      });

      const TestComponent = () => {
        const { typography } = useTheme();
        return (
          <View>
            <Text testID="title">{typography.title.fontSize}</Text>
            <Text testID="body">{typography.body.fontSize}</Text>
          </View>
        );
      };

      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // xlarge: 1.25倍
      expect(getByTestId('title').props.children).toBe(Math.round(18 * 1.25)); // 23
      expect(getByTestId('body').props.children).toBe(Math.round(14 * 1.25)); // 18
    });

    it('should adjust all typography properties based on fontSize setting', () => {
      useSettingsStore.setState({
        settings: {
          ...useSettingsStore.getState().settings,
          fontSize: 'large',
        },
      });

      const TestComponent = () => {
        const { typography } = useTheme();
        return (
          <View>
            <Text testID="subtitle">{typography.subtitle.fontSize}</Text>
            <Text testID="caption">{typography.caption.fontSize}</Text>
            <Text testID="header">{typography.header.fontSize}</Text>
          </View>
        );
      };

      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // large: 1.125倍
      expect(getByTestId('subtitle').props.children).toBe(Math.round(16 * 1.125)); // 18
      expect(getByTestId('caption').props.children).toBe(Math.round(12 * 1.125)); // 14
      expect(getByTestId('header').props.children).toBe(Math.round(16 * 1.125)); // 18
    });
  });

  describe('Spacing', () => {
    it('should provide consistent spacing values', () => {
      const TestComponent = () => {
        const { spacing } = useTheme();
        return (
          <View>
            <Text testID="xs">{spacing.xs}</Text>
            <Text testID="sm">{spacing.sm}</Text>
            <Text testID="md">{spacing.md}</Text>
            <Text testID="lg">{spacing.lg}</Text>
            <Text testID="xl">{spacing.xl}</Text>
            <Text testID="xxl">{spacing.xxl}</Text>
          </View>
        );
      };

      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(getByTestId('xs').props.children).toBe(4);
      expect(getByTestId('sm').props.children).toBe(8);
      expect(getByTestId('md').props.children).toBe(10);
      expect(getByTestId('lg').props.children).toBe(15);
      expect(getByTestId('xl').props.children).toBe(20);
      expect(getByTestId('xxl').props.children).toBe(24);
    });
  });

  describe('Shadows', () => {
    it('should provide shadow styles with correct color', () => {
      const TestComponent = () => {
        const { shadows } = useTheme();
        return (
          <View>
            <Text testID="shadowColor">{shadows.small.shadowColor}</Text>
            <Text testID="elevation">{shadows.medium.elevation}</Text>
          </View>
        );
      };

      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(getByTestId('shadowColor').props.children).toBe('#000');
      expect(getByTestId('elevation').props.children).toBe(5);
    });

    it('should have different shadow sizes', () => {
      const TestComponent = () => {
        const { shadows } = useTheme();
        return (
          <View>
            <Text testID="small">{shadows.small.elevation}</Text>
            <Text testID="medium">{shadows.medium.elevation}</Text>
            <Text testID="large">{shadows.large.elevation}</Text>
          </View>
        );
      };

      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(getByTestId('small').props.children).toBe(2);
      expect(getByTestId('medium').props.children).toBe(5);
      expect(getByTestId('large').props.children).toBe(8);
    });

    it('should use theme shadow color in dark theme', () => {
      useSettingsStore.setState({
        settings: {
          ...useSettingsStore.getState().settings,
          theme: 'dark',
        },
      });

      const TestComponent = () => {
        const { shadows } = useTheme();
        return <Text testID="shadowColor">{shadows.medium.shadowColor}</Text>;
      };

      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(getByTestId('shadowColor').props.children).toBe('#000');
    });
  });

  describe('Theme Reactivity', () => {
    it('should update theme when settings change', async () => {
      const TestComponent = () => {
        const { colors } = useTheme();
        return <Text testID="background">{colors.background}</Text>;
      };

      const { getByTestId, rerender } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // 初期状態: ライトテーマ
      expect(getByTestId('background').props.children).toBe('#fff');

      // ダークテーマに変更
      act(() => {
        useSettingsStore.setState({
          settings: {
            ...useSettingsStore.getState().settings,
            theme: 'dark',
          },
        });
      });

      // 再レンダリング
      rerender(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // ダークテーマの背景色に変更されているべき
      await waitFor(() => {
        expect(getByTestId('background').props.children).toBe('#000');
      });
    });

    it('should update typography when fontSize changes', async () => {
      const TestComponent = () => {
        const { typography } = useTheme();
        return <Text testID="title">{typography.title.fontSize}</Text>;
      };

      const { getByTestId, rerender } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // 初期状態: medium
      expect(getByTestId('title').props.children).toBe(18);

      // largeに変更
      act(() => {
        useSettingsStore.setState({
          settings: {
            ...useSettingsStore.getState().settings,
            fontSize: 'large',
          },
        });
      });

      // 再レンダリング
      rerender(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // largeのタイポグラフィに変更されているべき
      await waitFor(() => {
        expect(getByTestId('title').props.children).toBe(Math.round(18 * 1.125)); // 20
      });
    });
  });
});
