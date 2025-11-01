/**
 * @file MainContainer.tsx
 * @summary このファイルは、アプリケーション全体で使用する共通のコンテナコンポーネントを提供します。
 * @responsibility 画面全体のレイアウト、背景色、ローディング状態の管理を統一的に行います。
 */
import React from 'react';
import { View, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { useTheme } from '../design/theme/ThemeContext';

/**
 * MainContainerコンポーネントのプロパティ
 */
interface MainContainerProps {
  /**
   * コンテナ内に表示する子要素
   */
  children: React.ReactNode;

  /**
   * ローディング状態
   * trueの場合、childrenの代わりにActivityIndicatorを表示
   */
  isLoading?: boolean;

  /**
   * 背景色（オプション）
   * 指定しない場合はテーマのbackground色を使用
   */
  backgroundColor?: string;

  /**
   * コンテナに適用する追加スタイル
   */
  style?: ViewStyle;

  /**
   * コンテンツコンテナに適用する追加スタイル
   */
  contentContainerStyle?: ViewStyle;
}

/**
 * MainContainer
 *
 * アプリケーション全体で統一された画面レイアウトを提供するコンテナコンポーネント
 *
 * @example
 * ```tsx
 * <MainContainer isLoading={loading}>
 *   <Text>Content here</Text>
 * </MainContainer>
 * ```
 *
 * @example カスタム背景色の使用
 * ```tsx
 * <MainContainer backgroundColor={colors.secondary}>
 *   <FlatList ... />
 * </MainContainer>
 * ```
 */
export function MainContainer({
  children,
  isLoading = false,
  backgroundColor,
  style,
  contentContainerStyle,
}: MainContainerProps) {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: backgroundColor || colors.background,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, style]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const contentContainerStyles = StyleSheet.create({
    wrapper: {
      flex: 1,
    },
  });

  return (
    <View style={[styles.container, style]}>
      {contentContainerStyle ? (
        <View style={[contentContainerStyles.wrapper, contentContainerStyle]}>
          {children}
        </View>
      ) : (
        children
      )}
    </View>
  );
}
