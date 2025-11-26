import React, { useLayoutEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { CustomHeader } from '../../../components/CustomHeader';
import { useTheme } from '../../../design/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

/**
 * Settings画面のヘッダー設定フック
 * タイトルと戻るボタンを設定
 */
export const useSettingsHeader = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { colors, iconSizes } = useTheme();

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <CustomHeader
          title={t('settings.title')}
          leftButtons={[
            {
              icon: <Ionicons name="arrow-back-outline" size={iconSizes.medium} color={colors.text} />,
              onPress: handleGoBack,
            },
          ]}
        />
      ),
    });
  }, [navigation, handleGoBack, colors.text, iconSizes.medium, t]);
};
