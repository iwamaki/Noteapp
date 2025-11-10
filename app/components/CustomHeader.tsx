/**
 * @file CustomHeader.tsx
 * @summary このファイルは、アプリケーションのカスタムヘッダーコンポーネントを定義します。
 * @responsibility アプリケーション全体で一貫性のあるヘッダーUIを提供し、タイトル、左右のボタンなどの要素を柔軟に設定できるようにする責任があります。
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  flexRatio = { left: 1, center: 3, right: 5 },
}) => {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();

  // フォントサイズに基づいて動的にヘッダーの高さを計算
  const headerHeight = Math.max(56, typography.header.lineHeight + 20); // 最小56px、またはlineHeight + padding

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.tertiary,
      paddingTop: insets.top,
      height: headerHeight + insets.top,
      paddingHorizontal: 8,
    },
    leftSection: {
      flex: flexRatio.left,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    centerSection: {
      flex: flexRatio.center,
      alignItems: 'stretch', // flex-start から stretch に変更
      justifyContent: 'center',
    },
    rightSection: {
      flex: flexRatio.right,
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
      flexDirection: 'row',
      gap: 4,
    },
    titleText: {
      color: colors.text,
      fontSize: typography.header.fontSize,
      lineHeight: typography.header.lineHeight,
      fontWeight: '600',
    },
    button: {
      paddingHorizontal: 0,
      paddingVertical: 8,
      minWidth: 38,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonText: {
      fontSize: typography.subtitle.fontSize,
      lineHeight: typography.subtitle.lineHeight,
      fontWeight: '600',
      textAlign: 'center',
    },
    disabledButton: {
      opacity: 0.5,
    },
  });

  const getButtonColor = (variant: 'primary' | 'secondary' | 'danger' = 'primary', disabled?: boolean) => {
    if (disabled) return colors.textSecondary;

    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.textSecondary;
      case 'danger':
        return colors.danger;
      default:
        return colors.primary;
    }
  };

  const renderButtons = (buttons: HeaderConfig['leftButtons']) => {
    if (!buttons || buttons.length === 0) return null;

    return (
      <>
        {buttons.map((button, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.button,
              button.disabled && styles.disabledButton,
            ]}
            onPress={button.onPress}
            disabled={button.disabled}
          >
            {button.icon ? (
              button.icon
            ) : (
              <Text
                style={[
                  styles.buttonText,
                  {
                    color: getButtonColor(button.variant, button.disabled),
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {button.title}
              </Text>
            )}
          </TouchableOpacity>
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
