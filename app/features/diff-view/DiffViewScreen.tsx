/**
 * @file DiffViewScreen.tsx
 * @summary このファイルは、アプリケーションの差分表示画面をレンダリングします。
 * @responsibility ノートの変更履歴やドラフト内容の差分を表示し、選択した変更を適用またはバージョンを復元する機能を提供します。
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DiffViewer } from './components/DiffViewer';
import { useDiffView } from './hooks/useDiffView';

function DiffViewScreen() {
  const { diff, theme } = useDiffView();
  const { colors } = theme;

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