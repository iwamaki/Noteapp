/**
 * @file CustomHeader.tsx
 * @summary このファイルは、アプリケーションのカスタムヘッダーコンポーネントと、ヘッダー設定を生成するフックを定義します。
 * @responsibility アプリケーション全体で一貫性のあるヘッダーUIを提供し、タイトル、左右のボタンなどの要素を柔軟に設定できるようにする責任があります。
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { HeaderButton } from './HeaderButton';
import { useTheme } from '../design/theme/ThemeContext';

export interface HeaderConfig {
  title?: React.ReactNode;
  leftButtons?: Array<{
    title?: string;
    icon?: React.ReactNode; // Add icon property
    onPress: () => void | Promise<void>;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
  }>;
  rightButtons?: Array<{
    title?: string;
    icon?: React.ReactNode; // Add icon property
    onPress: () => void | Promise<void>;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
  }>;
}

export const CustomHeader: React.FC<HeaderConfig> = ({
  title,
  leftButtons = [],
  rightButtons = [],
}) => {
  const { spacing } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 44,
    },
    leftSection: {
      flex: 1,
      alignItems: 'flex-start',
    },
    centerSection: {
      flex: 2,
      alignItems: 'flex-start',
    },
    rightSection: {
      flex: 1,
      alignItems: 'flex-end',
    },
    buttonContainer: {
      flexDirection: 'row',
      marginHorizontal: spacing.md,
    },
  });

  const renderButtons = (buttons: HeaderConfig['leftButtons']) => {
    if (!buttons || buttons.length === 0) return null;

    return (
      <View style={styles.buttonContainer}>
        {buttons.map((button, index) => (
          <HeaderButton
            key={index}
            title={button.title}
            onPress={button.onPress}
            variant={button.variant}
          />
        ))}
      </View>
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
      backgroundColor: colors.secondary,
    },
    headerTintColor: colors.primary,
  });

  return { createHeaderConfig };
};
