import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { DiffView } from '../components/diff/DiffView';
import { DiffLine, DiffUtils, DiffManager } from '../utils/diffUtils';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';

type DiffViewScreenRouteProp = RouteProp<RootStackParamList, 'DiffView'>;
type DiffViewScreenNavigationProp = StackNavigationProp<RootStackParamList, 'DiffView'>;

interface DiffViewScreenProps {
  route: DiffViewScreenRouteProp;
  navigation: DiffViewScreenNavigationProp;
}

function DiffViewScreen({ route, navigation }: DiffViewScreenProps) {
  const { originalContent, newContent, filename } = route.params;

  // 差分を生成
  const diff = DiffUtils.generateDiff(originalContent, newContent);
  DiffManager.initializeDiff(diff);

  const [selectedBlocks, setSelectedBlocks] = useState<Set<number>>(
    new Set(DiffManager.getSelectedBlocks())
  );

  const handleBlockToggle = (blockId: number) => {
    DiffManager.toggleBlockSelection(blockId);
    setSelectedBlocks(new Set(DiffManager.getSelectedBlocks()));
  };

  const handleAllToggle = () => {
    DiffManager.toggleAllSelection(diff);
    setSelectedBlocks(new Set(DiffManager.getSelectedBlocks()));
  };

  const handleApply = () => {
    const selectedContent = DiffManager.generateSelectedContent(diff);
    if (selectedContent === null) {
      Alert.alert('エラー', '内容の生成に失敗しました');
      return;
    }

    // 選択された差分を適用して前の画面に戻る
    navigation.navigate('NoteEdit', {
      filename,
      content: selectedContent,
      saved: true, // 保存完了を示すフラグ
    });
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <DiffView
        diff={diff}
        selectedBlocks={selectedBlocks}
        onBlockToggle={handleBlockToggle}
        onAllToggle={handleAllToggle}
        onApply={handleApply}
        onCancel={handleCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default DiffViewScreen;
