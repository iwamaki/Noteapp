/**
 * @file ThemeContext.tsx
 * @summary このファイルは、アプリケーション全体のテーマ管理を提供するContextとProviderを定義します。
 * ユーザーの設定（テーマ、フォントサイズ）に基づいて動的にカラー、タイポグラフィ、スペーシングを提供します。
 * @responsibility settingsStoreと連携してテーマの切り替えを実現し、全コンポーネントで一貫したスタイルを利用可能にします。
 */
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useUISettingsStore } from '../../settings/settingsStore';

// ライトテーマのカラーパレット
const lightColors = {
  primary: '#007AFF',
  secondary: '#EEEEEE', // Adjusted secondary to a very light grey
  tertiary: '#999999', // 中程度のグレー（白背景に対してコントラスト強化）
  background: '#fff', // Reverted background to white
  text: '#333333', // Softer black for text
  textSecondary: '#666',
  border: '#ddd',
  shadow: '#000',
  success: '#218838', // 少し暗い緑に変更
  warning: '#ffc107',
  danger: '#dc3545',
  white: '#fff',
  black: '#000',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.5)',
  // LLMモデルカテゴリーのアクセントカラー
  accentQuick: '#FFC107', // Quickモデル用（黄色）
  accentThink: '#4CAF50', // Thinkモデル用（緑色）
};

// ダークテーマのカラーパレット
const darkColors = {
  primary: '#0A84FF',
  secondary: '#2C2C2C',
  tertiary: '#808080', // 明るいグレー（暗背景に対してコントラスト強化）
  background: '#1A1A1A',
  text: '#fff',
  textSecondary: '#888888',
  border: '#38383A',
  shadow: '#000',
  success: '#28B93F', // 少し暗い緑に変更
  warning: '#FFD60A',
  danger: '#FF453A',
  white: '#fff',
  black: '#000',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.5)',
  // LLMモデルカテゴリーのアクセントカラー
  accentQuick: '#FFC107', // Quickモデル用（黄色）
  accentThink: '#4CAF50', // Thinkモデル用（緑色）
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
  const headerSize = Math.round(18 * sizeMultiplier);
  const categorySize = Math.round(16 * sizeMultiplier);

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
    category: {
      fontSize: categorySize,
      lineHeight: Math.round(categorySize * lineHeightMultiplier),
      fontWeight: 'bold' as const,
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

// アイコンサイズを計算する関数
const getIconSizes = (typography: ReturnType<typeof getTypographyForSize>) => ({
  small: Math.round(typography.body.fontSize * 1.2),     // body の 1.2倍
  medium: Math.round(typography.header.fontSize * 1.3),  // header の 1.3倍（ヘッダーボタン用）
  large: Math.round(typography.title.fontSize * 1.8),    // title の 1.8倍
});

// テーマの型定義
type Theme = {
  colors: typeof lightColors;
  spacing: typeof spacing;
  typography: ReturnType<typeof getTypographyForSize>;
  shadows: ReturnType<typeof getShadows>;
  iconSizes: ReturnType<typeof getIconSizes>;
  themeMode: 'light' | 'dark';
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useUISettingsStore();
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
    const iconSizes = getIconSizes(typography);

    return { colors, spacing, typography, shadows, iconSizes, themeMode: effectiveTheme };
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
