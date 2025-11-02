/**
 * @file CustomHeader.tsx
 * @summary このファイルは、アプリケーションのカスタムヘッダーコンポーネントと、ヘッダー設定を生成するフックを定義します。
 * @responsibility アプリケーション全体で一貫性のあるヘッダーUIを提供し、タイトル、左右のボタンなどの要素を柔軟に設定できるようにする責任があります。
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderButton } from './HeaderButton';
import { useTheme } from '../design/theme/ThemeContext';

export interface HeaderConfig {
  title?: string | React.ReactNode;
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
  flexRatio = { left: 1, center: 3, right: 4 },
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
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    rightSection: {
      flex: flexRatio.right,
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
      flexDirection: 'row',
      gap: 8,
    },
    titleText: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '600',
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

  const renderTitle = () => {
    if (!title) return null;

    // titleが文字列の場合はTextコンポーネントでラップ
    if (typeof title === 'string') {
      return (
        <Text
          style={styles.titleText}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
      );
    }

    // ReactNodeの場合はそのまま返す
    return title;
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        {renderButtons(leftButtons)}
      </View>

      <View style={styles.centerSection}>
        {renderTitle()}
      </View>

      <View style={styles.rightSection}>
        {renderButtons(rightButtons)}
      </View>
    </View>
  );
};
