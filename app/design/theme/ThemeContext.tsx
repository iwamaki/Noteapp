/**
 * @file ThemeContext.tsx
 * @summary このファイルは、アプリケーション全体のテーマ管理を提供するContextとProviderを定義します。
 * ユーザーの設定（テーマ、フォントサイズ）に基づいて動的にカラー、タイポグラフィ、スペーシングを提供します。
 * @responsibility settingsStoreと連携してテーマの切り替えを実現し、全コンポーネントで一貫したスタイルを利用可能にします。
 */
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../../settings/settingsStore';

// ライトテーマのカラーパレット
const lightColors = {
  primary: '#007AFF',
  secondary: '#f5f5f5',
  background: '#fff',
  text: '#000',
  textSecondary: '#666',
  border: '#ddd',
  shadow: '#000',
  success: '#28a745',
  warning: '#ffc107',
  danger: '#dc3545',
  white: '#fff',
  black: '#000',
  transparent: 'transparent',
};

// ダークテーマのカラーパレット
const darkColors = {
  primary: '#0A84FF',
  secondary: '#1C1C1E',
  background: '#000',
  text: '#fff',
  textSecondary: '#98989D',
  border: '#38383A',
  shadow: '#000',
  success: '#32D74B',
  warning: '#FFD60A',
  danger: '#FF453A',
  white: '#fff',
  black: '#000',
  transparent: 'transparent',
};

// スペーシング（テーマに依存しない）
const spacing = {
  xs: 4,
  sm: 8,
  md: 10,
  lg: 15,
  xl: 20,
  xxl: 24,
};

// フォントサイズ設定に基づくタイポグラフィ
const getTypographyForSize = (fontSize: 'small' | 'medium' | 'large' | 'xlarge') => {
  const sizeMultiplier = {
    small: 0.875,
    medium: 1,
    large: 1.125,
    xlarge: 1.25,
  }[fontSize];

  return {
    title: {
      fontSize: Math.round(18 * sizeMultiplier),
      fontWeight: 'bold' as const,
    },
    subtitle: {
      fontSize: Math.round(16 * sizeMultiplier),
      fontWeight: '600' as const,
    },
    body: {
      fontSize: Math.round(14 * sizeMultiplier),
    },
    caption: {
      fontSize: Math.round(12 * sizeMultiplier),
    },
    header: {
      fontSize: Math.round(16 * sizeMultiplier),
    },
  };
};

// シャドウ（カラーはテーマから取得）
const getShadows = (shadowColor: string) => ({
  small: {
    shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  medium: {
    shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  large: {
    shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
});

// テーマの型定義
type Theme = {
  colors: typeof lightColors;
  spacing: typeof spacing;
  typography: ReturnType<typeof getTypographyForSize>;
  shadows: ReturnType<typeof getShadows>;
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettingsStore();
  const systemColorScheme = useColorScheme();

  const theme = useMemo(() => {
    // テーマの決定: 'system'の場合はOSの設定を使用
    let effectiveTheme: 'light' | 'dark' = 'light';
    if (settings.theme === 'system') {
      effectiveTheme = systemColorScheme === 'dark' ? 'dark' : 'light';
    } else {
      effectiveTheme = settings.theme;
    }

    const colors = effectiveTheme === 'dark' ? darkColors : lightColors;
    const typography = getTypographyForSize(settings.fontSize);
    const shadows = getShadows(colors.shadow);

    return { colors, spacing, typography, shadows };
  }, [settings.theme, settings.fontSize, systemColorScheme]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return theme;
}
