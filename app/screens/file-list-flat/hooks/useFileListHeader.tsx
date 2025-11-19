import React, { useLayoutEffect } from 'react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/types';
import { CustomHeader } from '../../../components/CustomHeader';
import { useTheme } from '../../../design/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface UseFileListHeaderProps {
  onCreateNew: () => void;
  onSettings: () => void;
  onImport?: () => void;
}

/**
 * FileList画面のヘッダー設定フック
 * 新規作成、インポート、設定ボタンを右側に配置
 */
export const useFileListHeader = ({
  onCreateNew,
  onSettings,
  onImport,
}: UseFileListHeaderProps) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { colors, iconSizes } = useTheme();

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <CustomHeader
          title={undefined}
          rightButtons={[
            {
              icon: <Ionicons name="add-circle-outline" size={iconSizes.medium} color={colors.text} />,
              onPress: onCreateNew,
            },
            ...(onImport
              ? [
                  {
                    icon: <Ionicons name="download-outline" size={iconSizes.medium} color={colors.text} />,
                    onPress: onImport,
                  },
                ]
              : []),
            {
              icon: <Ionicons name="settings-outline" size={iconSizes.medium} color={colors.text} />,
              onPress: onSettings,
            },
          ]}
        />
      ),
    });
  }, [navigation, onCreateNew, onSettings, onImport, colors, iconSizes.medium]);
};
