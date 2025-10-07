/**
 * @file DiffViewScreen.tsx
 * @summary このファイルは、アプリケーションの差分表示画面をレンダリングします。
 * @responsibility ノートの変更履歴やドラフト内容の差分を表示し、選択した変更を適用またはバージョンを復元する機能を提供します。
 */
import React, { useMemo, useLayoutEffect } from 'react';
import { View, StyleSheet, Alert, Text } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';

import { useNoteStore } from '../../store/note';
import { generateDiff } from '../../services/diffService';
import { NoteStorageService } from '../../services/storageService';
import { DiffViewer } from './components/DiffViewer';
import { useCustomHeader } from '../../components/CustomHeader';
import { useTheme } from '../../theme/ThemeContext';
import { logger } from '../../utils/logger'; // loggerをインポート
import { Ionicons } from '@expo/vector-icons';

type DiffViewScreenNavigationProp = StackNavigationProp<RootStackParamList, 'DiffView'>;
type DiffViewScreenRouteProp = ReturnType<typeof useRoute<import('@react-navigation/native').RouteProp<RootStackParamList, 'DiffView'>>>;

function DiffViewScreen() {
  const navigation = useNavigation<DiffViewScreenNavigationProp>();
  const route = useRoute<DiffViewScreenRouteProp>();
  const { colors, typography } = useTheme();
  const { createHeaderConfig } = useCustomHeader();
  const { selectNote } = useNoteStore();

  const { mode, originalContent, newContent } = route.params;

  // デバッグ用ログ
  logger.debug('diff', '[DiffViewScreen] Content analysis:', {
    mode,
    originalLength: originalContent.length,
    newLength: newContent.length,
    originalPreview: originalContent.substring(0, 100),
    newPreview: newContent.substring(0, 100)
  });

  const diff = useMemo(() => generateDiff(originalContent, newContent), [
    originalContent,
    newContent,
  ]);

  const handleRestore = async () => {
    if (route.params.mode !== 'restore') return;

    const { noteId, versionId } = route.params;
    try {
      const restoredNote = await NoteStorageService.restoreNoteVersion(noteId, versionId);
      await selectNote(restoredNote.id);
      Alert.alert('復元完了', 'ノートが指定されたバージョンに復元されました。');
      navigation.navigate('NoteEdit', { noteId: restoredNote.id, saved: true });
    } catch (error) {
      console.error('復元エラー:', error);
      Alert.alert('エラー', 'ノートの復元に失敗しました。');
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  useLayoutEffect(() => {
    const { mode } = route.params;
    let titleText = '';
    let rightButtons: any[] = [];

    if (mode === 'restore') {
      titleText = '復元';
      rightButtons = [
        {
          title: '復元',
          onPress: handleRestore,
          variant: 'primary' as const,
        },
      ];
    } else if (mode === 'readonly') {
      titleText = '差分表示';
      // 読み取り専用モードでは右側のボタンはなし
    }

    navigation.setOptions(
      createHeaderConfig({
        title: <Text style={{ color: colors.text, fontSize: typography.header.fontSize }}>{titleText}</Text>,
        leftButtons: [
          {
            icon: <Ionicons name="arrow-back-outline" size={24} color={colors.textSecondary} />,
            onPress: handleBack,
            variant: 'secondary',
          },
        ],
        rightButtons,
      })
    );
  }, [navigation, route.params, handleRestore, handleBack, colors]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });

  return (
    <View style={styles.container}>
      <DiffViewer
        diff={diff}
        selectedBlocks={new Set()}
        onBlockToggle={() => {}}
        isReadOnly={true}
      />
    </View>
  );
}

export default DiffViewScreen;