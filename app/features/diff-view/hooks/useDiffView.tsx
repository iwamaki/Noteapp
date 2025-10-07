// useDiffView.ts

import React from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useLayoutEffect, useMemo, useCallback } from 'react';
import { Alert, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NoteEditStorage, StorageError } from '../../note-edit/noteStorage';
import { RootStackParamList } from '../../../navigation/types';
import { useCustomHeader, HeaderConfig } from '../../../components/CustomHeader';
import { generateDiff } from '../../../services/diffService';
import { useTheme } from '../../../theme/ThemeContext';

type DiffViewScreenRouteProp = RouteProp<RootStackParamList, 'DiffView'>;

export const useDiffView = () => {
  const navigation = useNavigation();
  const route = useRoute<DiffViewScreenRouteProp>();
  const { colors, typography } = useTheme();
  const { createHeaderConfig } = useCustomHeader();

  // Destructure params based on mode
  const { mode, originalContent, newContent } = route.params;
  const noteId = mode === 'restore' ? route.params.noteId : undefined;
  const versionId = mode === 'restore' ? route.params.versionId : undefined;

  const diff = useMemo(() => {
    if (!originalContent || !newContent) {
      return [];
    }
    return generateDiff(originalContent, newContent);
  }, [originalContent, newContent]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRestore = useCallback(async () => {
    Alert.alert(
      '復元確認',
      'このバージョンにノートを復元しますか？現在の内容は上書きされます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '復元',
          onPress: async () => {
            try {
              if (mode === 'restore' && noteId && versionId) {
                await NoteEditStorage.restoreNoteVersion(noteId, versionId);
                Alert.alert('成功', 'ノートが正常に復元されました。');
                navigation.goBack(); // 復元後、前の画面に戻る
              } else if (mode !== 'restore') {
                throw new Error('復元モードではありません。');
              } else {
                throw new Error('ノートIDまたはバージョンIDが見つかりません。');
              }
            } catch (error) {
              console.error('Failed to restore note version:', error);
              if (error instanceof StorageError) {
                Alert.alert('復元エラー', `ノートの復元に失敗しました: ${error.message}`);
              } else {
                Alert.alert('復元エラー', 'ノートの復元中に不明なエラーが発生しました。');
              }
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [mode, noteId, versionId, navigation]);

  useLayoutEffect(() => {
    let titleText = '';
    let rightButtons: HeaderConfig['rightButtons'] = [];

    if (mode === 'restore') {
      titleText = 'バージョン比較 (復元)';
      rightButtons = [{ title: '復元', onPress: handleRestore, variant: 'primary' }];
    } else if (mode === 'readonly') {
      titleText = 'バージョン比較';
    }

    navigation.setOptions(
      createHeaderConfig({
        title: <Text style={{ color: colors.text, fontSize: typography.header.fontSize }}>{titleText}</Text>,
        leftButtons: [{
          icon: <Ionicons name="arrow-back-outline" size={24} color={colors.textSecondary} />,
          onPress: handleBack,
          variant: 'secondary'
        }],
        rightButtons: rightButtons,
      })
    );
  }, [navigation, createHeaderConfig, handleBack, handleRestore, mode, colors, typography]);

  return {
    diff,
    handleBack,
    handleRestore,
  };
};
