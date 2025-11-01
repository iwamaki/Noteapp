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
  secondary: '#EEEEEE', // Adjusted secondary to a very light grey
  tertiary: '#D0D0D0', // やや暗めの無彩色（カテゴリー背景などに使用）
  background: '#fff', // Reverted background to white
  text: '#333333', // Softer black for text
  textSecondary: '#666',
  border: '#ddd',
  shadow: '#000',
  success: '#28a745',
  warning: '#ffc107',
  danger: '#dc3545',
  white: '#fff',
  black: '#000',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

// ダークテーマのカラーパレット
const darkColors = {
  primary: '#0A84FF',
  secondary: '#2C2C2C',
  tertiary: '#505050', // 明るめの無彩色（カテゴリー背景などに使用）
  background: '#1A1A1A',
  text: '#fff',
  textSecondary: '#888888',
  border: '#38383A',
  shadow: '#000',
  success: '#32D74B',
  warning: '#FFD60A',
  danger: '#FF453A',
  white: '#fff',
  black: '#000',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.5)',
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

  // 基本フォントサイズ
  const titleSize = Math.round(18 * sizeMultiplier);
  const subtitleSize = Math.round(16 * sizeMultiplier);
  const bodySize = Math.round(14 * sizeMultiplier);
  const captionSize = Math.round(12 * sizeMultiplier);
  const headerSize = Math.round(16 * sizeMultiplier);

  // lineHeight倍率（可読性と行の揃いのバランス）
  const lineHeightMultiplier = 1.5;

  return {
    title: {
      fontSize: titleSize,
      lineHeight: Math.round(titleSize * lineHeightMultiplier),
      fontWeight: 'bold' as const,
    },
    subtitle: {
      fontSize: subtitleSize,
      lineHeight: Math.round(subtitleSize * lineHeightMultiplier),
      fontWeight: '600' as const,
    },
    body: {
      fontSize: bodySize,
      lineHeight: Math.round(bodySize * lineHeightMultiplier),
    },
    caption: {
      fontSize: captionSize,
      lineHeight: Math.round(captionSize * lineHeightMultiplier),
    },
    header: {
      fontSize: headerSize,
      lineHeight: Math.round(headerSize * lineHeightMultiplier),
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
  themeMode: 'light' | 'dark';
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

    return { colors, spacing, typography, shadows, themeMode: effectiveTheme };
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
