/**
 * @file useTokenPurchaseHeader.tsx
 * @summary トークン購入画面のヘッダーロジックを管理するフック
 * @responsibility ヘッダーボタンの設定とナビゲーション処理を担当
 */

import React, { useLayoutEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../../navigation/types';
import { CustomHeader } from '../../../components/CustomHeader';
import { useTheme } from '../../../design/theme/ThemeContext';

export const useTokenPurchaseHeader = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { colors, iconSizes } = useTheme();

  // 戻るボタンハンドラ
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ヘッダー設定を更新
  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <CustomHeader
          title="購入"
          leftButtons={[
            {
              icon: <Ionicons name="arrow-back-outline" size={iconSizes.medium} color={colors.text} />,
              onPress: handleGoBack,
            },
          ]}
        />
      ),
    });
  }, [
    navigation,
    handleGoBack,
    colors.text,
    iconSizes.medium,
  ]);
};
