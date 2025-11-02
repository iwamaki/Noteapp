/**
 * @file CustomHeader.tsx
 * @summary このファイルは、アプリケーションのカスタムヘッダーコンポーネントと、ヘッダー設定を生成するフックを定義します。
 * @responsibility アプリケーション全体で一貫性のあるヘッダーUIを提供し、タイトル、左右のボタンなどの要素を柔軟に設定できるようにする責任があります。
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderButton } from './HeaderButton';
import { useTheme } from '../design/theme/ThemeContext';

export interface HeaderConfig {
  title?: React.ReactNode;
  leftButtons?: Array<{
    title?: string;
    icon?: React.ReactNode;
    onPress: () => void | Promise<void>;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
  }>;
  rightButtons?: Array<{
    title?: string;
    icon?: React.ReactNode;
    onPress: () => void | Promise<void>;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
  }>;
  flexRatio?: {
    left: number;
    center: number;
    right: number;
  };
}

export const CustomHeader: React.FC<HeaderConfig> = ({
  title,
  leftButtons = [],
  rightButtons = [],
  flexRatio = { left: 1, center: 1, right: 1 },
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingTop: insets.top,
      height: 56 + insets.top,
      paddingHorizontal: 8,
    },
    leftSection: {
      flex: flexRatio.left,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    centerSection: {
      flex: flexRatio.center,
      alignItems: 'stretch',
      justifyContent: 'center',
    },
    rightSection: {
      flex: flexRatio.right,
      alignItems: 'flex-end',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
  });

  const renderButtons = (buttons: HeaderConfig['leftButtons']) => {
    if (!buttons || buttons.length === 0) return null;

    return (
      <>
        {buttons.map((button, index) => (
          <HeaderButton
            key={index}
            title={button.title}
            icon={button.icon}
            onPress={button.onPress}
            variant={button.variant}
            disabled={button.disabled}
          />
        ))}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        {renderButtons(leftButtons)}
      </View>

      <View style={styles.centerSection}>
        {title}
      </View>

      <View style={styles.rightSection}>
        {renderButtons(rightButtons)}
      </View>
    </View>
  );
};

export const useCustomHeader = () => {
  const { colors } = useTheme(); // フックのトップレベルで useTheme を呼び出す


  const buttonContainerStyle = {
    flexDirection: 'row' as const,
    marginHorizontal: 10,
  };

  const createHeaderConfig = (config: HeaderConfig) => ({
    headerTitle: () => config.title || null,
    headerTitleAlign: 'left' as const,
    headerTitleContainerStyle: {
      flex: 2,
      paddingHorizontal: 0,
    },
    headerLeftContainerStyle: {
      flex: 1,
    },
    headerRightContainerStyle: {
      flex: 2,
    },
    headerLeft: () => {
      if (!config.leftButtons?.length) return null;
      return (
        <View style={buttonContainerStyle}>
          {config.leftButtons.map((button, index) => (
            <HeaderButton
              key={index}
              title={button.title}
              icon={button.icon}
              onPress={button.onPress}
              variant={button.variant}
              disabled={button.disabled}
            />
          ))}
        </View>
      );
    },
    headerRight: () => {
      if (!config.rightButtons?.length) return null;
      return (
        <View style={buttonContainerStyle}>
          {config.rightButtons.map((button, index) => (
            <HeaderButton
              key={index}
              title={button.title}
              icon={button.icon}
              onPress={button.onPress}
              variant={button.variant}
              disabled={button.disabled}
            />
          ))}
        </View>
      );
    },
    // ヘッダー自体のスタイルもテーマに合わせる
    headerStyle: {
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTintColor: colors.text,
  });

  return { createHeaderConfig };
};
