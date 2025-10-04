/**
 * @file useNoteEditHeader.ts
 * @summary ノート編集画面のヘッダー設定ロジックを管理するフック
 */

import { useLayoutEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/types';
import { useCustomHeader } from '../../../components/CustomHeader';
import { ViewMode } from '../components/FileEditor';

interface UseNoteEditHeaderProps {
  title: string;
  activeNoteId: string | undefined;
  viewMode: ViewMode;
  isLoading: boolean;
  headerTitle: React.ReactNode;
  onViewModeChange: (mode: ViewMode) => void;
  onSave: () => void;
}

export const useNoteEditHeader = ({
  title,
  activeNoteId,
  viewMode,
  isLoading,
  headerTitle,
  onViewModeChange,
  onSave,
}: UseNoteEditHeaderProps) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { createHeaderConfig } = useCustomHeader();

  useLayoutEffect(() => {
    const rightButtons: Array<{
      title: string;
      onPress: () => void;
      variant?: 'primary' | 'secondary' | 'danger';
    }> = [];

    if (!isLoading) {
      // ビューモードに応じたボタン
      if (viewMode === 'content') {
        rightButtons.push({
          title: '編集',
          onPress: () => onViewModeChange('edit'),
          variant: 'primary',
        });
      } else if (viewMode === 'edit') {
        rightButtons.push({
          title: 'プレビュー',
          onPress: () => onViewModeChange('preview'),
          variant: 'secondary',
        });
        rightButtons.push({
          title: '保存',
          onPress: onSave,
          variant: 'primary',
        });
      } else if (viewMode === 'preview') {
        rightButtons.push({
          title: '編集に戻る',
          onPress: () => onViewModeChange('edit'),
          variant: 'secondary',
        });
      }

      // 履歴ボタン
      rightButtons.push({
        title: '履歴',
        onPress: () =>
          navigation.navigate('VersionHistory', { noteId: activeNoteId || '' }),
        variant: 'secondary',
      });
    }

    navigation.setOptions(
      createHeaderConfig({
        title: headerTitle,
        leftButtons: [
          {
            title: '\u2190',
            onPress: () => navigation.goBack(),
            variant: 'secondary',
          },
        ],
        rightButtons,
      })
    );
  }, [
    navigation,
    title,
    activeNoteId,
    viewMode,
    isLoading,
    headerTitle,
    onViewModeChange,
    onSave,
    createHeaderConfig,
  ]);
};
