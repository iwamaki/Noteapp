/**
 * @file commonStyles.ts
 * @summary このファイルは、アプリケーション全体で一貫したUIを構築するための共通スタイル、カラーパレット、スペーシング、タイポグラフィ、シャドウ、およびレイアウトユーティリティを定義します。
 * @responsibility アプリケーションの視覚的な一貫性を保ち、開発者が再利用可能なスタイルプロパティに簡単にアクセスできるようにすることで、UI開発の効率と保守性を向上させます。
 */
import { StyleSheet, Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const colors = {
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
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 10,
  lg: 15,
  xl: 20,
  xxl: 24,
};

export const typography = {
  title: {
    fontSize: 18,
    fontWeight: 'bold' as const,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 14,
  },
  caption: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  header: {
    fontSize: 16,
    color: colors.primary,
  },
};

export const shadows = {
  small: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  medium: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  large: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
};

export const layout = {
  container: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  centered: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  row: {
    flexDirection: 'row' as const,
  },
  column: {
    flexDirection: 'column' as const,
  },
};

export const responsive = {
  screenWidth,
  screenHeight,
  isSmallScreen: screenWidth < 375,
  isMediumScreen: screenWidth >= 375 && screenWidth < 414,
  isLargeScreen: screenWidth >= 414,
  getResponsiveSize: (small: number, medium: number, large: number) => {
    if (screenWidth < 375) return small;
    if (screenWidth < 414) return medium;
    return large;
  },
};

export const commonStyles = StyleSheet.create({
  container: {
    ...layout.container,
  },
  centered: {
    ...layout.centered,
  },
  row: {
    ...layout.row,
  },
  column: {
    ...layout.column,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.lg,
    ...shadows.small,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    ...layout.centered,
  },
  buttonText: {
    color: colors.background,
    ...typography.subtitle,
  },
});