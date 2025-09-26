import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { DiffView } from '../components/diff/DiffView';
import { DiffLine, DiffUtils, DiffManager } from '../utils/diffUtils';

interface DiffViewScreenProps {
  route: {
    params: {
      originalContent: string;
      newContent: string;
      filename: string;
    };
  };
  navigation: any;
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
