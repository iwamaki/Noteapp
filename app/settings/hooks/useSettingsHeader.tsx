import React, { useLayoutEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { CustomHeader } from '../../components/CustomHeader';
import { useTheme } from '../../design/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

/**
 * Settings画面のヘッダー設定フック
 * タイトルと戻るボタンを設定
 */
export const useSettingsHeader = () => {
  const navigation = useNavigation();
  const { colors, iconSizes } = useTheme();

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <CustomHeader
          title="設定"
          leftButtons={[
            {
              icon: <Ionicons name="arrow-back-outline" size={iconSizes.medium} color={colors.text} />,
              onPress: handleGoBack,
            },
          ]}
        />
      ),
    });
  }, [navigation, handleGoBack, colors.text, iconSizes.medium]);
};
