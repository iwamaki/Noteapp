import React, { useLayoutEffect } from 'react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/types';
import { useCustomHeader, HeaderConfig } from '../../../components/CustomHeader';
import { useTheme } from '../../../design/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface UseFileListHeaderProps {
  onCreateNew: () => void;
  onSettings: () => void;
}

/**
 * FileList画面のヘッダー設定フック
 * 新規作成ボタンと設定ボタンを右側に配置
 */
export const useFileListHeader = ({
  onCreateNew,
  onSettings,
}: UseFileListHeaderProps) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { createHeaderConfig } = useCustomHeader();
  const { colors } = useTheme();

  useLayoutEffect(() => {
    navigation.setOptions(
      createHeaderConfig({
        title: undefined,
        rightButtons: [
          {
            icon: <Ionicons name="add-circle-outline" size={24} color={colors.text} />,
            onPress: onCreateNew,
          },
          {
            icon: <Ionicons name="settings-outline" size={24} color={colors.text} />,
            onPress: onSettings,
          },
        ],
      })
    );
  }, [navigation, createHeaderConfig, onCreateNew, onSettings, colors]);
};
